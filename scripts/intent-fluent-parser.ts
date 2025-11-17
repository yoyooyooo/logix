import path from "node:path";
import process from "node:process";
import {
  ArrowFunction,
  CallExpression,
  FunctionExpression,
  Node,
  Project,
  PropertyAccessExpression,
  SyntaxKind,
  YieldExpression,
} from "ts-morph";

type SourceKind = "state" | "action" | "stream";

interface Location {
  file: string;
  line: number;
  column: number;
}

interface PipelineOp {
  op: string;
  raw: string;
}

interface IntentRuleLike {
  id: string;
  loc: Location;
  source: {
    kind: SourceKind;
    raw: string;
  };
  pipeline: PipelineOp[];
  sink: {
    raw: string;
  };
}

type ErrorCode = "ERR_ASYNC_HANDLER" | "ERR_SPLIT_CHAIN" | "ERR_UNSUPPORTED_OP";

interface ParseError {
  code: ErrorCode;
  message: string;
  loc: Location;
  raw: string;
}

interface ParserResult {
  rules: IntentRuleLike[];
  errors: ParseError[];
}

function usage(): never {
  console.error("用法: pnpm tsx scripts/intent-fluent-parser.ts --file path/to/logic.ts");
  process.exit(1);
}

function locOf(node: Node): Location {
  const sf = node.getSourceFile();
  return {
    file: path.relative(process.cwd(), sf.getFilePath()),
    line: node.getStartLineNumber(),
    // 简化处理：列号暂时固定为 1，后续如有需要再精细计算。
    column: 1,
  };
}

function isAsyncFunction(node: Node | undefined): node is ArrowFunction | FunctionExpression {
  if (!node) return false;
  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
    return node.isAsync();
  }
  return false;
}

function isThenCall(call: CallExpression): PropertyAccessExpression | undefined {
  const expr = call.getExpression();
  if (Node.isPropertyAccessExpression(expr) && expr.getName() === "then") {
    return expr;
  }
  return undefined;
}

interface OpCall {
  op: string;
  call: CallExpression;
}

function parseFluentChain(
  yieldExpr: YieldExpression,
  thenCall: CallExpression,
  thenExpr: PropertyAccessExpression,
): { rule?: IntentRuleLike; errors: ParseError[] } {
  const errors: ParseError[] = [];

  // 检查 handler 是否为 async 函数
  const handler = thenCall.getArguments()[0];
  if (isAsyncFunction(handler)) {
    errors.push({
      code: "ERR_ASYNC_HANDLER",
      message: "then 的第一个参数是 async 函数，请改写为 Effect.gen + yield* 形式。",
      loc: locOf(handler),
      raw: handler.getText(),
    });
    return { errors };
  }

  const target = thenExpr.getExpression();

  // 拆链场景：flow.then(...)
  if (Node.isIdentifier(target)) {
    errors.push({
      code: "ERR_SPLIT_CHAIN",
      message:
        "检测到以变量形式调用 then（例如 flow.then(...)）。根据 v3 约定，Fluent 链必须写在单条 yield* 语句中，不能拆成中间变量。",
      loc: locOf(target),
      raw: thenCall.getText(),
    });
    return { errors };
  }

  // 仅处理 $.when*(...) 开头的链，其余视为不受支持形态
  if (!Node.isCallExpression(target)) {
    errors.push({
      code: "ERR_UNSUPPORTED_OP",
      message: "当前 then 调用不以 $.when 开头，或链条结构不在受支持的 Fluent 子集中。",
      loc: locOf(target),
      raw: thenCall.getText(),
    });
    return { errors };
  }

  // 从 then 的目标开始向左回溯整个链条：$.whenState(...).op1().op2()
  const chain: OpCall[] = [];
  let currentCall: CallExpression | undefined = target;

  while (currentCall) {
    const callee = currentCall.getExpression();
    if (!Node.isPropertyAccessExpression(callee)) {
      break;
    }
    const name = callee.getName();
    chain.unshift({ op: name, call: currentCall });

    const inner = callee.getExpression();
    if (Node.isCallExpression(inner)) {
      currentCall = inner;
      continue;
    }
    break;
  }

  // 寻找根部的 when 调用
  const rootIdx = chain.findIndex((c) => c.op === "when");
  if (rootIdx === -1) {
    errors.push({
      code: "ERR_UNSUPPORTED_OP",
      message: "未在 Fluent 链中找到 $.when 根调用，Parser 暂不支持解析该 Fluent 链。",
      loc: locOf(thenCall),
      raw: thenCall.getText(),
    });
    return { errors };
  }

  const root = chain[rootIdx];
  const pipelineCalls = chain.slice(rootIdx + 1);

  const rootCall = root.call;
  const args = rootCall.getArguments();
  const rootArg = args[0];
  const rootArgText = rootArg ? rootArg.getText() : "";

  let sourceKind: SourceKind = "stream";
  if (rootArg) {
    if (Node.isArrowFunction(rootArg) || Node.isFunctionExpression(rootArg)) {
      sourceKind = "state";
    } else if (Node.isStringLiteral(rootArg)) {
      sourceKind = "action";
    }
  }

  const pipeline: PipelineOp[] = pipelineCalls.map((c) => ({
    op: c.op,
    raw: c.call.getText(),
  }));

  const sinkRaw = thenCall.getArguments()[0]?.getText() ?? "";

  const loc = locOf(yieldExpr);

  const rule: IntentRuleLike = {
    id: `${loc.file}:${loc.line}`,
    loc,
    source: {
      kind: sourceKind,
      raw: rootArgText,
    },
    pipeline,
    sink: {
      raw: sinkRaw,
    },
  };

  return { rule, errors };
}

function main(): void {
  const args = process.argv.slice(2);
  const fileFlagIndex = args.indexOf("--file");
  if (fileFlagIndex === -1 || !args[fileFlagIndex + 1]) {
    usage();
  }

  const filePath = path.resolve(process.cwd(), args[fileFlagIndex + 1]);

  const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });

  const sourceFile = project.addSourceFileAtPath(filePath);

  const result: ParserResult = {
    rules: [],
    errors: [],
  };

  const yieldExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.YieldExpression);

  for (const y of yieldExpressions) {
    const expr = y.getExpression();
    if (!expr || !Node.isCallExpression(expr)) {
      continue;
    }
    const thenExpr = isThenCall(expr);
    if (!thenExpr) {
      continue;
    }

    const { rule, errors } = parseFluentChain(y, expr, thenExpr);
    result.errors.push(...errors);
    if (rule) {
      result.rules.push(rule);
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
