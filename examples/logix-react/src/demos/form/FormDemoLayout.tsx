// Example role: Minimum stable form flow
// Covers: SC-A
// Capability refs: CAP-01, CAP-02, CAP-03, CAP-04, CAP-24, CAP-25
// Proof refs: PF-01
// SSoT: docs/ssot/form/06-capability-scenario-api-support-map.md

import React from "react";
import { Effect, Schema } from "effect";
import * as Logix from "@logixjs/core";
import { RuntimeProvider, fieldValue, rawFormMeta, useModule, useSelector } from "@logixjs/react";
import * as Form from "@logixjs/form";

const ValuesSchema = Schema.Struct({
  value: Schema.String,
});

type Values = Schema.Schema.Type<typeof ValuesSchema>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readPath = (value: unknown, path: ReadonlyArray<string>): unknown => {
  let current: unknown = value;
  for (const segment of path) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
};

const readFieldError = (errors: unknown, fieldPath: string): unknown =>
  readPath(errors, ["$manual", fieldPath]) ??
  readPath(errors, [fieldPath]) ??
  readPath(errors, ["$schema", fieldPath]);

const readFieldTouched = (ui: unknown, fieldPath: string): boolean => {
  const value = readPath(ui, [fieldPath]);
  if (!isRecord(value)) return false;
  return value.touched === true;
};

const DemoForm = Form.make(
  "FormDemo",
  {
    values: ValuesSchema,
    initialValues: {
      value: "",
    },
  },
  (form) => {
    form.field("value").rule(
      Form.Rule.make({
        required: true,
      }),
    );
  },
);

const runtime = Logix.Runtime.make(DemoForm, {
  label: "FormDemoRuntime",
  devtools: true,
});

const DemoFormPanel: React.FC = () => {
  const form = useModule(DemoForm);
  const value = useSelector(form, fieldValue("value"));
  const meta = useSelector(form, rawFormMeta());
  const errors = useSelector(form, fieldValue("errors"));
  const ui = useSelector(form, fieldValue("ui"));
  const error = React.useMemo(() => readFieldError(errors, "value"), [errors]);
  const touched = React.useMemo(() => readFieldTouched(ui, "value"), [ui]);
  const canSubmit = meta.errorCount === 0 && meta.isSubmitting !== true;
  const isValid = meta.errorCount === 0;

  const onReset = () => {
    void Effect.runPromise(form.reset());
  };

  const onSubmit = () => {
    void runtime.runPromiseExit(
      form.submit({
        onValid: (_values: Values) => Effect.void,
        onInvalid: () => Effect.void,
      }),
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          快速开始表单
        </h3>
        <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
          Canonical · Quick Start
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          输入值
          <input
            type="text"
            value={String(value ?? "")}
            onChange={(e) => {
              void Effect.runPromise(form.field("value").set(e.target.value));
            }}
            onBlur={() => {
              void Effect.runPromise(form.field("value").blur());
            }}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2"
            placeholder="输入一些内容..."
          />
        </label>

        {touched && Boolean(error) && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {String(error)}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>dirty：{meta.isDirty ? "是" : "否"}</span>
          <span>valid：{isValid ? "是" : "否"}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
            onClick={onReset}
          >
            重置
          </button>
          <button
            type="button"
            className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 active:bg-blue-800 transition-all active:scale-95 shadow-sm shadow-blue-600/20"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            提交
          </button>
        </div>
      </div>
    </div>
  );
};

export const FormDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={runtime}>
      <div className="space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Form · 快速开始
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            这一页只讲默认主链：{" "}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
              Form.make
            </code>{" "}
            配合
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400 mx-1">
              define(form)
            </code>
            收口 submit / validation / dirty state。它是 docs quick-start 的默认 runnable example；运行入口仍由{" "}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
              Logix.Runtime.make
            </code>
            承接。
          </p>
        </div>

        <div className="pt-2">
          <DemoFormPanel />
        </div>
      </div>
    </RuntimeProvider>
  );
};
