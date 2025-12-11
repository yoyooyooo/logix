// @logix/core kernel bundle for @logix/sandbox
// effect 从 esm.sh CDN 加载 (v3.19.8)

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../logix-core/src/Module.ts
var Module_exports = {};
__export(Module_exports, {
  Reducer: () => Reducer,
  make: () => make4
});

// ../../node_modules/.pnpm/mutative@1.3.0/node_modules/mutative/dist/mutative.esm.mjs
var Operation = {
  Remove: "remove",
  Replace: "replace",
  Add: "add"
};
var PROXY_DRAFT = /* @__PURE__ */ Symbol.for("__MUTATIVE_PROXY_DRAFT__");
var RAW_RETURN_SYMBOL = /* @__PURE__ */ Symbol("__MUTATIVE_RAW_RETURN_SYMBOL__");
var iteratorSymbol = Symbol.iterator;
var dataTypes = {
  mutable: "mutable",
  immutable: "immutable"
};
var internal = {};
function has(target, key) {
  return target instanceof Map ? target.has(key) : Object.prototype.hasOwnProperty.call(target, key);
}
function getDescriptor(target, key) {
  if (key in target) {
    let prototype = Reflect.getPrototypeOf(target);
    while (prototype) {
      const descriptor = Reflect.getOwnPropertyDescriptor(prototype, key);
      if (descriptor)
        return descriptor;
      prototype = Reflect.getPrototypeOf(prototype);
    }
  }
  return;
}
function isBaseSetInstance(obj) {
  return Object.getPrototypeOf(obj) === Set.prototype;
}
function isBaseMapInstance(obj) {
  return Object.getPrototypeOf(obj) === Map.prototype;
}
function latest(proxyDraft) {
  var _a;
  return (_a = proxyDraft.copy) !== null && _a !== void 0 ? _a : proxyDraft.original;
}
function isDraft(target) {
  return !!getProxyDraft(target);
}
function getProxyDraft(value) {
  if (typeof value !== "object")
    return null;
  return value === null || value === void 0 ? void 0 : value[PROXY_DRAFT];
}
function getValue(value) {
  var _a;
  const proxyDraft = getProxyDraft(value);
  return proxyDraft ? (_a = proxyDraft.copy) !== null && _a !== void 0 ? _a : proxyDraft.original : value;
}
function isDraftable(value, options) {
  if (!value || typeof value !== "object")
    return false;
  let markResult;
  return Object.getPrototypeOf(value) === Object.prototype || Array.isArray(value) || value instanceof Map || value instanceof Set || !!(options === null || options === void 0 ? void 0 : options.mark) && ((markResult = options.mark(value, dataTypes)) === dataTypes.immutable || typeof markResult === "function");
}
function getPath(target, path = []) {
  if (Object.hasOwnProperty.call(target, "key")) {
    const parentCopy = target.parent.copy;
    const proxyDraft = getProxyDraft(get(parentCopy, target.key));
    if (proxyDraft !== null && (proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.original) !== target.original) {
      return null;
    }
    const isSet = target.parent.type === 3;
    const key = isSet ? Array.from(target.parent.setMap.keys()).indexOf(target.key) : target.key;
    if (!(isSet && parentCopy.size > key || has(parentCopy, key)))
      return null;
    path.push(key);
  }
  if (target.parent) {
    return getPath(target.parent, path);
  }
  path.reverse();
  try {
    resolvePath(target.copy, path);
  } catch (e) {
    return null;
  }
  return path;
}
function getType(target) {
  if (Array.isArray(target))
    return 1;
  if (target instanceof Map)
    return 2;
  if (target instanceof Set)
    return 3;
  return 0;
}
function get(target, key) {
  return getType(target) === 2 ? target.get(key) : target[key];
}
function set(target, key, value) {
  const type = getType(target);
  if (type === 2) {
    target.set(key, value);
  } else {
    target[key] = value;
  }
}
function peek(target, key) {
  const state = getProxyDraft(target);
  const source = state ? latest(state) : target;
  return source[key];
}
function isEqual(x, y) {
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
function revokeProxy(proxyDraft) {
  if (!proxyDraft)
    return;
  while (proxyDraft.finalities.revoke.length > 0) {
    const revoke = proxyDraft.finalities.revoke.pop();
    revoke();
  }
}
function escapePath(path, pathAsArray) {
  return pathAsArray ? path : [""].concat(path).map((_item) => {
    const item = `${_item}`;
    if (item.indexOf("/") === -1 && item.indexOf("~") === -1)
      return item;
    return item.replace(/~/g, "~0").replace(/\//g, "~1");
  }).join("/");
}
function resolvePath(base, path) {
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    base = get(getType(base) === 3 ? Array.from(base) : base, key);
    if (typeof base !== "object") {
      throw new Error(`Cannot resolve patch at '${path.join("/")}'.`);
    }
  }
  return base;
}
function strictCopy(target) {
  const copy = Object.create(Object.getPrototypeOf(target));
  Reflect.ownKeys(target).forEach((key) => {
    let desc = Reflect.getOwnPropertyDescriptor(target, key);
    if (desc.enumerable && desc.configurable && desc.writable) {
      copy[key] = target[key];
      return;
    }
    if (!desc.writable) {
      desc.writable = true;
      desc.configurable = true;
    }
    if (desc.get || desc.set)
      desc = {
        configurable: true,
        writable: true,
        enumerable: desc.enumerable,
        value: target[key]
      };
    Reflect.defineProperty(copy, key, desc);
  });
  return copy;
}
var propIsEnum = Object.prototype.propertyIsEnumerable;
function shallowCopy(original, options) {
  let markResult;
  if (Array.isArray(original)) {
    return Array.prototype.concat.call(original);
  } else if (original instanceof Set) {
    if (!isBaseSetInstance(original)) {
      const SubClass = Object.getPrototypeOf(original).constructor;
      return new SubClass(original.values());
    }
    return Set.prototype.difference ? Set.prototype.difference.call(original, /* @__PURE__ */ new Set()) : new Set(original.values());
  } else if (original instanceof Map) {
    if (!isBaseMapInstance(original)) {
      const SubClass = Object.getPrototypeOf(original).constructor;
      return new SubClass(original);
    }
    return new Map(original);
  } else if ((options === null || options === void 0 ? void 0 : options.mark) && (markResult = options.mark(original, dataTypes), markResult !== void 0) && markResult !== dataTypes.mutable) {
    if (markResult === dataTypes.immutable) {
      return strictCopy(original);
    } else if (typeof markResult === "function") {
      if (options.enablePatches || options.enableAutoFreeze) {
        throw new Error(`You can't use mark and patches or auto freeze together.`);
      }
      return markResult();
    }
    throw new Error(`Unsupported mark result: ${markResult}`);
  } else if (typeof original === "object" && Object.getPrototypeOf(original) === Object.prototype) {
    const copy = {};
    Object.keys(original).forEach((key) => {
      copy[key] = original[key];
    });
    Object.getOwnPropertySymbols(original).forEach((key) => {
      if (propIsEnum.call(original, key)) {
        copy[key] = original[key];
      }
    });
    return copy;
  } else {
    throw new Error(`Please check mark() to ensure that it is a stable marker draftable function.`);
  }
}
function ensureShallowCopy(target) {
  if (target.copy)
    return;
  target.copy = shallowCopy(target.original, target.options);
}
function deepClone(target) {
  if (!isDraftable(target))
    return getValue(target);
  if (Array.isArray(target))
    return target.map(deepClone);
  if (target instanceof Map) {
    const iterable = Array.from(target.entries()).map(([k, v]) => [
      k,
      deepClone(v)
    ]);
    if (!isBaseMapInstance(target)) {
      const SubClass = Object.getPrototypeOf(target).constructor;
      return new SubClass(iterable);
    }
    return new Map(iterable);
  }
  if (target instanceof Set) {
    const iterable = Array.from(target).map(deepClone);
    if (!isBaseSetInstance(target)) {
      const SubClass = Object.getPrototypeOf(target).constructor;
      return new SubClass(iterable);
    }
    return new Set(iterable);
  }
  const copy = Object.create(Object.getPrototypeOf(target));
  for (const key in target)
    copy[key] = deepClone(target[key]);
  return copy;
}
function cloneIfNeeded(target) {
  return isDraft(target) ? deepClone(target) : target;
}
function markChanged(proxyDraft) {
  var _a;
  proxyDraft.assignedMap = (_a = proxyDraft.assignedMap) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new Map();
  if (!proxyDraft.operated) {
    proxyDraft.operated = true;
    if (proxyDraft.parent) {
      markChanged(proxyDraft.parent);
    }
  }
}
function throwFrozenError() {
  throw new Error("Cannot modify frozen object");
}
function deepFreeze(target, subKey, updatedValues, stack, keys) {
  {
    updatedValues = updatedValues !== null && updatedValues !== void 0 ? updatedValues : /* @__PURE__ */ new WeakMap();
    stack = stack !== null && stack !== void 0 ? stack : [];
    keys = keys !== null && keys !== void 0 ? keys : [];
    const value = updatedValues.has(target) ? updatedValues.get(target) : target;
    if (stack.length > 0) {
      const index = stack.indexOf(value);
      if (value && typeof value === "object" && index !== -1) {
        if (stack[0] === value) {
          throw new Error(`Forbids circular reference`);
        }
        throw new Error(`Forbids circular reference: ~/${keys.slice(0, index).map((key, index2) => {
          if (typeof key === "symbol")
            return `[${key.toString()}]`;
          const parent = stack[index2];
          if (typeof key === "object" && (parent instanceof Map || parent instanceof Set))
            return Array.from(parent.keys()).indexOf(key);
          return key;
        }).join("/")}`);
      }
      stack.push(value);
      keys.push(subKey);
    } else {
      stack.push(value);
    }
  }
  if (Object.isFrozen(target) || isDraft(target)) {
    {
      stack.pop();
      keys.pop();
    }
    return;
  }
  const type = getType(target);
  switch (type) {
    case 2:
      for (const [key, value] of target) {
        deepFreeze(key, key, updatedValues, stack, keys);
        deepFreeze(value, key, updatedValues, stack, keys);
      }
      target.set = target.clear = target.delete = throwFrozenError;
      break;
    case 3:
      for (const value of target) {
        deepFreeze(value, value, updatedValues, stack, keys);
      }
      target.add = target.clear = target.delete = throwFrozenError;
      break;
    case 1:
      Object.freeze(target);
      let index = 0;
      for (const value of target) {
        deepFreeze(value, index, updatedValues, stack, keys);
        index += 1;
      }
      break;
    default:
      Object.freeze(target);
      Object.keys(target).forEach((name) => {
        const value = target[name];
        deepFreeze(value, name, updatedValues, stack, keys);
      });
  }
  {
    stack.pop();
    keys.pop();
  }
}
function forEach(target, iter) {
  const type = getType(target);
  if (type === 0) {
    Reflect.ownKeys(target).forEach((key) => {
      iter(key, target[key], target);
    });
  } else if (type === 1) {
    let index = 0;
    for (const entry of target) {
      iter(index, entry, target);
      index += 1;
    }
  } else {
    target.forEach((entry, index) => iter(index, entry, target));
  }
}
function handleValue(target, handledSet, options) {
  if (isDraft(target) || !isDraftable(target, options) || handledSet.has(target) || Object.isFrozen(target))
    return;
  const isSet = target instanceof Set;
  const setMap = isSet ? /* @__PURE__ */ new Map() : void 0;
  handledSet.add(target);
  forEach(target, (key, value) => {
    var _a;
    if (isDraft(value)) {
      const proxyDraft = getProxyDraft(value);
      ensureShallowCopy(proxyDraft);
      const updatedValue = ((_a = proxyDraft.assignedMap) === null || _a === void 0 ? void 0 : _a.size) || proxyDraft.operated ? proxyDraft.copy : proxyDraft.original;
      set(isSet ? setMap : target, key, updatedValue);
    } else {
      handleValue(value, handledSet, options);
    }
  });
  if (setMap) {
    const set2 = target;
    const values = Array.from(set2);
    set2.clear();
    values.forEach((value) => {
      set2.add(setMap.has(value) ? setMap.get(value) : value);
    });
  }
}
function finalizeAssigned(proxyDraft, key) {
  const copy = proxyDraft.type === 3 ? proxyDraft.setMap : proxyDraft.copy;
  if (proxyDraft.finalities.revoke.length > 1 && proxyDraft.assignedMap.get(key) && copy) {
    handleValue(get(copy, key), proxyDraft.finalities.handledSet, proxyDraft.options);
  }
}
function finalizeSetValue(target) {
  if (target.type === 3 && target.copy) {
    target.copy.clear();
    target.setMap.forEach((value) => {
      target.copy.add(getValue(value));
    });
  }
}
function finalizePatches(target, generatePatches2, patches, inversePatches) {
  const shouldFinalize = target.operated && target.assignedMap && target.assignedMap.size > 0 && !target.finalized;
  if (shouldFinalize) {
    if (patches && inversePatches) {
      const basePath = getPath(target);
      if (basePath) {
        generatePatches2(target, basePath, patches, inversePatches);
      }
    }
    target.finalized = true;
  }
}
function markFinalization(target, key, value, generatePatches2) {
  const proxyDraft = getProxyDraft(value);
  if (proxyDraft) {
    if (!proxyDraft.callbacks) {
      proxyDraft.callbacks = [];
    }
    proxyDraft.callbacks.push((patches, inversePatches) => {
      var _a;
      const copy = target.type === 3 ? target.setMap : target.copy;
      if (isEqual(get(copy, key), value)) {
        let updatedValue = proxyDraft.original;
        if (proxyDraft.copy) {
          updatedValue = proxyDraft.copy;
        }
        finalizeSetValue(target);
        finalizePatches(target, generatePatches2, patches, inversePatches);
        if (target.options.enableAutoFreeze) {
          target.options.updatedValues = (_a = target.options.updatedValues) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new WeakMap();
          target.options.updatedValues.set(updatedValue, proxyDraft.original);
        }
        set(copy, key, updatedValue);
      }
    });
    if (target.options.enableAutoFreeze) {
      if (proxyDraft.finalities !== target.finalities) {
        target.options.enableAutoFreeze = false;
      }
    }
  }
  if (isDraftable(value, target.options)) {
    target.finalities.draft.push(() => {
      const copy = target.type === 3 ? target.setMap : target.copy;
      if (isEqual(get(copy, key), value)) {
        finalizeAssigned(target, key);
      }
    });
  }
}
function generateArrayPatches(proxyState, basePath, patches, inversePatches, pathAsArray) {
  let { original, assignedMap, options } = proxyState;
  let copy = proxyState.copy;
  if (copy.length < original.length) {
    [original, copy] = [copy, original];
    [patches, inversePatches] = [inversePatches, patches];
  }
  for (let index = 0; index < original.length; index += 1) {
    if (assignedMap.get(index.toString()) && copy[index] !== original[index]) {
      const _path = basePath.concat([index]);
      const path = escapePath(_path, pathAsArray);
      patches.push({
        op: Operation.Replace,
        path,
        // If it is a draft, it needs to be deep cloned, and it may also be non-draft.
        value: cloneIfNeeded(copy[index])
      });
      inversePatches.push({
        op: Operation.Replace,
        path,
        // If it is a draft, it needs to be deep cloned, and it may also be non-draft.
        value: cloneIfNeeded(original[index])
      });
    }
  }
  for (let index = original.length; index < copy.length; index += 1) {
    const _path = basePath.concat([index]);
    const path = escapePath(_path, pathAsArray);
    patches.push({
      op: Operation.Add,
      path,
      // If it is a draft, it needs to be deep cloned, and it may also be non-draft.
      value: cloneIfNeeded(copy[index])
    });
  }
  if (original.length < copy.length) {
    const { arrayLengthAssignment = true } = options.enablePatches;
    if (arrayLengthAssignment) {
      const _path = basePath.concat(["length"]);
      const path = escapePath(_path, pathAsArray);
      inversePatches.push({
        op: Operation.Replace,
        path,
        value: original.length
      });
    } else {
      for (let index = copy.length; original.length < index; index -= 1) {
        const _path = basePath.concat([index - 1]);
        const path = escapePath(_path, pathAsArray);
        inversePatches.push({
          op: Operation.Remove,
          path
        });
      }
    }
  }
}
function generatePatchesFromAssigned({ original, copy, assignedMap }, basePath, patches, inversePatches, pathAsArray) {
  assignedMap.forEach((assignedValue, key) => {
    const originalValue = get(original, key);
    const value = cloneIfNeeded(get(copy, key));
    const op = !assignedValue ? Operation.Remove : has(original, key) ? Operation.Replace : Operation.Add;
    if (isEqual(originalValue, value) && op === Operation.Replace)
      return;
    const _path = basePath.concat(key);
    const path = escapePath(_path, pathAsArray);
    patches.push(op === Operation.Remove ? { op, path } : { op, path, value });
    inversePatches.push(op === Operation.Add ? { op: Operation.Remove, path } : op === Operation.Remove ? { op: Operation.Add, path, value: originalValue } : { op: Operation.Replace, path, value: originalValue });
  });
}
function generateSetPatches({ original, copy }, basePath, patches, inversePatches, pathAsArray) {
  let index = 0;
  original.forEach((value) => {
    if (!copy.has(value)) {
      const _path = basePath.concat([index]);
      const path = escapePath(_path, pathAsArray);
      patches.push({
        op: Operation.Remove,
        path,
        value
      });
      inversePatches.unshift({
        op: Operation.Add,
        path,
        value
      });
    }
    index += 1;
  });
  index = 0;
  copy.forEach((value) => {
    if (!original.has(value)) {
      const _path = basePath.concat([index]);
      const path = escapePath(_path, pathAsArray);
      patches.push({
        op: Operation.Add,
        path,
        value
      });
      inversePatches.unshift({
        op: Operation.Remove,
        path,
        value
      });
    }
    index += 1;
  });
}
function generatePatches(proxyState, basePath, patches, inversePatches) {
  const { pathAsArray = true } = proxyState.options.enablePatches;
  switch (proxyState.type) {
    case 0:
    case 2:
      return generatePatchesFromAssigned(proxyState, basePath, patches, inversePatches, pathAsArray);
    case 1:
      return generateArrayPatches(proxyState, basePath, patches, inversePatches, pathAsArray);
    case 3:
      return generateSetPatches(proxyState, basePath, patches, inversePatches, pathAsArray);
  }
}
var readable = false;
var checkReadable = (value, options, ignoreCheckDraftable = false) => {
  if (typeof value === "object" && value !== null && (!isDraftable(value, options) || ignoreCheckDraftable) && !readable) {
    throw new Error(`Strict mode: Mutable data cannot be accessed directly, please use 'unsafe(callback)' wrap.`);
  }
};
var mapHandler = {
  get size() {
    const current2 = latest(getProxyDraft(this));
    return current2.size;
  },
  has(key) {
    return latest(getProxyDraft(this)).has(key);
  },
  set(key, value) {
    const target = getProxyDraft(this);
    const source = latest(target);
    if (!source.has(key) || !isEqual(source.get(key), value)) {
      ensureShallowCopy(target);
      markChanged(target);
      target.assignedMap.set(key, true);
      target.copy.set(key, value);
      markFinalization(target, key, value, generatePatches);
    }
    return this;
  },
  delete(key) {
    if (!this.has(key)) {
      return false;
    }
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    markChanged(target);
    if (target.original.has(key)) {
      target.assignedMap.set(key, false);
    } else {
      target.assignedMap.delete(key);
    }
    target.copy.delete(key);
    return true;
  },
  clear() {
    const target = getProxyDraft(this);
    if (!this.size)
      return;
    ensureShallowCopy(target);
    markChanged(target);
    target.assignedMap = /* @__PURE__ */ new Map();
    for (const [key] of target.original) {
      target.assignedMap.set(key, false);
    }
    target.copy.clear();
  },
  forEach(callback, thisArg) {
    const target = getProxyDraft(this);
    latest(target).forEach((_value, _key) => {
      callback.call(thisArg, this.get(_key), _key, this);
    });
  },
  get(key) {
    var _a, _b;
    const target = getProxyDraft(this);
    const value = latest(target).get(key);
    const mutable = ((_b = (_a = target.options).mark) === null || _b === void 0 ? void 0 : _b.call(_a, value, dataTypes)) === dataTypes.mutable;
    if (target.options.strict) {
      checkReadable(value, target.options, mutable);
    }
    if (mutable) {
      return value;
    }
    if (target.finalized || !isDraftable(value, target.options)) {
      return value;
    }
    if (value !== target.original.get(key)) {
      return value;
    }
    const draft = internal.createDraft({
      original: value,
      parentDraft: target,
      key,
      finalities: target.finalities,
      options: target.options
    });
    ensureShallowCopy(target);
    target.copy.set(key, draft);
    return draft;
  },
  keys() {
    return latest(getProxyDraft(this)).keys();
  },
  values() {
    const iterator = this.keys();
    return {
      [iteratorSymbol]: () => this.values(),
      next: () => {
        const result = iterator.next();
        if (result.done)
          return result;
        const value = this.get(result.value);
        return {
          done: false,
          value
        };
      }
    };
  },
  entries() {
    const iterator = this.keys();
    return {
      [iteratorSymbol]: () => this.entries(),
      next: () => {
        const result = iterator.next();
        if (result.done)
          return result;
        const value = this.get(result.value);
        return {
          done: false,
          value: [result.value, value]
        };
      }
    };
  },
  [iteratorSymbol]() {
    return this.entries();
  }
};
var mapHandlerKeys = Reflect.ownKeys(mapHandler);
var getNextIterator = (target, iterator, { isValuesIterator }) => () => {
  var _a, _b;
  const result = iterator.next();
  if (result.done)
    return result;
  const key = result.value;
  let value = target.setMap.get(key);
  const currentDraft = getProxyDraft(value);
  const mutable = ((_b = (_a = target.options).mark) === null || _b === void 0 ? void 0 : _b.call(_a, value, dataTypes)) === dataTypes.mutable;
  if (target.options.strict) {
    checkReadable(key, target.options, mutable);
  }
  if (!mutable && !currentDraft && isDraftable(key, target.options) && !target.finalized && target.original.has(key)) {
    const proxy = internal.createDraft({
      original: key,
      parentDraft: target,
      key,
      finalities: target.finalities,
      options: target.options
    });
    target.setMap.set(key, proxy);
    value = proxy;
  } else if (currentDraft) {
    value = currentDraft.proxy;
  }
  return {
    done: false,
    value: isValuesIterator ? value : [value, value]
  };
};
var setHandler = {
  get size() {
    const target = getProxyDraft(this);
    return target.setMap.size;
  },
  has(value) {
    const target = getProxyDraft(this);
    if (target.setMap.has(value))
      return true;
    ensureShallowCopy(target);
    const valueProxyDraft = getProxyDraft(value);
    if (valueProxyDraft && target.setMap.has(valueProxyDraft.original))
      return true;
    return false;
  },
  add(value) {
    const target = getProxyDraft(this);
    if (!this.has(value)) {
      ensureShallowCopy(target);
      markChanged(target);
      target.assignedMap.set(value, true);
      target.setMap.set(value, value);
      markFinalization(target, value, value, generatePatches);
    }
    return this;
  },
  delete(value) {
    if (!this.has(value)) {
      return false;
    }
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    markChanged(target);
    const valueProxyDraft = getProxyDraft(value);
    if (valueProxyDraft && target.setMap.has(valueProxyDraft.original)) {
      target.assignedMap.set(valueProxyDraft.original, false);
      return target.setMap.delete(valueProxyDraft.original);
    }
    if (!valueProxyDraft && target.setMap.has(value)) {
      target.assignedMap.set(value, false);
    } else {
      target.assignedMap.delete(value);
    }
    return target.setMap.delete(value);
  },
  clear() {
    if (!this.size)
      return;
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    markChanged(target);
    for (const value of target.original) {
      target.assignedMap.set(value, false);
    }
    target.setMap.clear();
  },
  values() {
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    const iterator = target.setMap.keys();
    return {
      [Symbol.iterator]: () => this.values(),
      next: getNextIterator(target, iterator, { isValuesIterator: true })
    };
  },
  entries() {
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    const iterator = target.setMap.keys();
    return {
      [Symbol.iterator]: () => this.entries(),
      next: getNextIterator(target, iterator, {
        isValuesIterator: false
      })
    };
  },
  keys() {
    return this.values();
  },
  [iteratorSymbol]() {
    return this.values();
  },
  forEach(callback, thisArg) {
    const iterator = this.values();
    let result = iterator.next();
    while (!result.done) {
      callback.call(thisArg, result.value, result.value, this);
      result = iterator.next();
    }
  }
};
if (Set.prototype.difference) {
  Object.assign(setHandler, {
    intersection(other) {
      return Set.prototype.intersection.call(new Set(this.values()), other);
    },
    union(other) {
      return Set.prototype.union.call(new Set(this.values()), other);
    },
    difference(other) {
      return Set.prototype.difference.call(new Set(this.values()), other);
    },
    symmetricDifference(other) {
      return Set.prototype.symmetricDifference.call(new Set(this.values()), other);
    },
    isSubsetOf(other) {
      return Set.prototype.isSubsetOf.call(new Set(this.values()), other);
    },
    isSupersetOf(other) {
      return Set.prototype.isSupersetOf.call(new Set(this.values()), other);
    },
    isDisjointFrom(other) {
      return Set.prototype.isDisjointFrom.call(new Set(this.values()), other);
    }
  });
}
var setHandlerKeys = Reflect.ownKeys(setHandler);
var proxyHandler = {
  get(target, key, receiver) {
    var _a, _b;
    const copy = (_a = target.copy) === null || _a === void 0 ? void 0 : _a[key];
    if (copy && target.finalities.draftsCache.has(copy)) {
      return copy;
    }
    if (key === PROXY_DRAFT)
      return target;
    let markResult;
    if (target.options.mark) {
      const value2 = key === "size" && (target.original instanceof Map || target.original instanceof Set) ? Reflect.get(target.original, key) : Reflect.get(target.original, key, receiver);
      markResult = target.options.mark(value2, dataTypes);
      if (markResult === dataTypes.mutable) {
        if (target.options.strict) {
          checkReadable(value2, target.options, true);
        }
        return value2;
      }
    }
    const source = latest(target);
    if (source instanceof Map && mapHandlerKeys.includes(key)) {
      if (key === "size") {
        return Object.getOwnPropertyDescriptor(mapHandler, "size").get.call(target.proxy);
      }
      const handle = mapHandler[key];
      return handle.bind(target.proxy);
    }
    if (source instanceof Set && setHandlerKeys.includes(key)) {
      if (key === "size") {
        return Object.getOwnPropertyDescriptor(setHandler, "size").get.call(target.proxy);
      }
      const handle = setHandler[key];
      return handle.bind(target.proxy);
    }
    if (!has(source, key)) {
      const desc = getDescriptor(source, key);
      return desc ? `value` in desc ? desc.value : (
        // !case: support for getter
        (_b = desc.get) === null || _b === void 0 ? void 0 : _b.call(target.proxy)
      ) : void 0;
    }
    const value = source[key];
    if (target.options.strict) {
      checkReadable(value, target.options);
    }
    if (target.finalized || !isDraftable(value, target.options)) {
      return value;
    }
    if (value === peek(target.original, key)) {
      ensureShallowCopy(target);
      target.copy[key] = createDraft({
        original: target.original[key],
        parentDraft: target,
        key: target.type === 1 ? Number(key) : key,
        finalities: target.finalities,
        options: target.options
      });
      if (typeof markResult === "function") {
        const subProxyDraft = getProxyDraft(target.copy[key]);
        ensureShallowCopy(subProxyDraft);
        markChanged(subProxyDraft);
        return subProxyDraft.copy;
      }
      return target.copy[key];
    }
    if (isDraft(value)) {
      target.finalities.draftsCache.add(value);
    }
    return value;
  },
  set(target, key, value) {
    var _a;
    if (target.type === 3 || target.type === 2) {
      throw new Error(`Map/Set draft does not support any property assignment.`);
    }
    let _key;
    if (target.type === 1 && key !== "length" && !(Number.isInteger(_key = Number(key)) && _key >= 0 && (key === 0 || _key === 0 || String(_key) === String(key)))) {
      throw new Error(`Only supports setting array indices and the 'length' property.`);
    }
    const desc = getDescriptor(latest(target), key);
    if (desc === null || desc === void 0 ? void 0 : desc.set) {
      desc.set.call(target.proxy, value);
      return true;
    }
    const current2 = peek(latest(target), key);
    const currentProxyDraft = getProxyDraft(current2);
    if (currentProxyDraft && isEqual(currentProxyDraft.original, value)) {
      target.copy[key] = value;
      target.assignedMap = (_a = target.assignedMap) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new Map();
      target.assignedMap.set(key, false);
      return true;
    }
    if (isEqual(value, current2) && (value !== void 0 || has(target.original, key)))
      return true;
    ensureShallowCopy(target);
    markChanged(target);
    if (has(target.original, key) && isEqual(value, target.original[key])) {
      target.assignedMap.delete(key);
    } else {
      target.assignedMap.set(key, true);
    }
    target.copy[key] = value;
    markFinalization(target, key, value, generatePatches);
    return true;
  },
  has(target, key) {
    return key in latest(target);
  },
  ownKeys(target) {
    return Reflect.ownKeys(latest(target));
  },
  getOwnPropertyDescriptor(target, key) {
    const source = latest(target);
    const descriptor = Reflect.getOwnPropertyDescriptor(source, key);
    if (!descriptor)
      return descriptor;
    return {
      writable: true,
      configurable: target.type !== 1 || key !== "length",
      enumerable: descriptor.enumerable,
      value: source[key]
    };
  },
  getPrototypeOf(target) {
    return Reflect.getPrototypeOf(target.original);
  },
  setPrototypeOf() {
    throw new Error(`Cannot call 'setPrototypeOf()' on drafts`);
  },
  defineProperty() {
    throw new Error(`Cannot call 'defineProperty()' on drafts`);
  },
  deleteProperty(target, key) {
    var _a;
    if (target.type === 1) {
      return proxyHandler.set.call(this, target, key, void 0, target.proxy);
    }
    if (peek(target.original, key) !== void 0 || key in target.original) {
      ensureShallowCopy(target);
      markChanged(target);
      target.assignedMap.set(key, false);
    } else {
      target.assignedMap = (_a = target.assignedMap) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new Map();
      target.assignedMap.delete(key);
    }
    if (target.copy)
      delete target.copy[key];
    return true;
  }
};
function createDraft(createDraftOptions) {
  const { original, parentDraft, key, finalities, options } = createDraftOptions;
  const type = getType(original);
  const proxyDraft = {
    type,
    finalized: false,
    parent: parentDraft,
    original,
    copy: null,
    proxy: null,
    finalities,
    options,
    // Mapping of draft Set items to their corresponding draft values.
    setMap: type === 3 ? new Map(original.entries()) : void 0
  };
  if (key || "key" in createDraftOptions) {
    proxyDraft.key = key;
  }
  const { proxy, revoke } = Proxy.revocable(type === 1 ? Object.assign([], proxyDraft) : proxyDraft, proxyHandler);
  finalities.revoke.push(revoke);
  proxyDraft.proxy = proxy;
  if (parentDraft) {
    const target = parentDraft;
    target.finalities.draft.push((patches, inversePatches) => {
      var _a, _b;
      const oldProxyDraft = getProxyDraft(proxy);
      let copy = target.type === 3 ? target.setMap : target.copy;
      const draft = get(copy, key);
      const proxyDraft2 = getProxyDraft(draft);
      if (proxyDraft2) {
        let updatedValue = proxyDraft2.original;
        if (proxyDraft2.operated) {
          updatedValue = getValue(draft);
        }
        finalizeSetValue(proxyDraft2);
        finalizePatches(proxyDraft2, generatePatches, patches, inversePatches);
        if (target.options.enableAutoFreeze) {
          target.options.updatedValues = (_a = target.options.updatedValues) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new WeakMap();
          target.options.updatedValues.set(updatedValue, proxyDraft2.original);
        }
        set(copy, key, updatedValue);
      }
      (_b = oldProxyDraft.callbacks) === null || _b === void 0 ? void 0 : _b.forEach((callback) => {
        callback(patches, inversePatches);
      });
    });
  } else {
    const target = getProxyDraft(proxy);
    target.finalities.draft.push((patches, inversePatches) => {
      finalizeSetValue(target);
      finalizePatches(target, generatePatches, patches, inversePatches);
    });
  }
  return proxy;
}
internal.createDraft = createDraft;
function finalizeDraft(result, returnedValue, patches, inversePatches, enableAutoFreeze) {
  var _a;
  const proxyDraft = getProxyDraft(result);
  const original = (_a = proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.original) !== null && _a !== void 0 ? _a : result;
  const hasReturnedValue = !!returnedValue.length;
  if (proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.operated) {
    while (proxyDraft.finalities.draft.length > 0) {
      const finalize = proxyDraft.finalities.draft.pop();
      finalize(patches, inversePatches);
    }
  }
  const state = hasReturnedValue ? returnedValue[0] : proxyDraft ? proxyDraft.operated ? proxyDraft.copy : proxyDraft.original : result;
  if (proxyDraft)
    revokeProxy(proxyDraft);
  if (enableAutoFreeze) {
    deepFreeze(state, state, proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.options.updatedValues);
  }
  return [
    state,
    patches && hasReturnedValue ? [{ op: Operation.Replace, path: [], value: returnedValue[0] }] : patches,
    inversePatches && hasReturnedValue ? [{ op: Operation.Replace, path: [], value: original }] : inversePatches
  ];
}
function draftify(baseState, options) {
  var _a;
  const finalities = {
    draft: [],
    revoke: [],
    handledSet: /* @__PURE__ */ new WeakSet(),
    draftsCache: /* @__PURE__ */ new WeakSet()
  };
  let patches;
  let inversePatches;
  if (options.enablePatches) {
    patches = [];
    inversePatches = [];
  }
  const isMutable = ((_a = options.mark) === null || _a === void 0 ? void 0 : _a.call(options, baseState, dataTypes)) === dataTypes.mutable || !isDraftable(baseState, options);
  const draft = isMutable ? baseState : createDraft({
    original: baseState,
    parentDraft: null,
    finalities,
    options
  });
  return [
    draft,
    (returnedValue = []) => {
      const [finalizedState, finalizedPatches, finalizedInversePatches] = finalizeDraft(draft, returnedValue, patches, inversePatches, options.enableAutoFreeze);
      return options.enablePatches ? [finalizedState, finalizedPatches, finalizedInversePatches] : finalizedState;
    }
  ];
}
function handleReturnValue(options) {
  const { rootDraft, value, useRawReturn = false, isRoot = true } = options;
  forEach(value, (key, item, source) => {
    const proxyDraft = getProxyDraft(item);
    if (proxyDraft && rootDraft && proxyDraft.finalities === rootDraft.finalities) {
      options.isContainDraft = true;
      const currentValue = proxyDraft.original;
      if (source instanceof Set) {
        const arr = Array.from(source);
        source.clear();
        arr.forEach((_item) => source.add(key === _item ? currentValue : _item));
      } else {
        set(source, key, currentValue);
      }
    } else if (typeof item === "object" && item !== null) {
      options.value = item;
      options.isRoot = false;
      handleReturnValue(options);
    }
  });
  if (isRoot) {
    if (!options.isContainDraft)
      console.warn(`The return value does not contain any draft, please use 'rawReturn()' to wrap the return value to improve performance.`);
    if (useRawReturn) {
      console.warn(`The return value contains drafts, please don't use 'rawReturn()' to wrap the return value.`);
    }
  }
}
function getCurrent(target) {
  var _a;
  const proxyDraft = getProxyDraft(target);
  if (!isDraftable(target, proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.options))
    return target;
  const type = getType(target);
  if (proxyDraft && !proxyDraft.operated)
    return proxyDraft.original;
  let currentValue;
  function ensureShallowCopy2() {
    currentValue = type === 2 ? !isBaseMapInstance(target) ? new (Object.getPrototypeOf(target)).constructor(target) : new Map(target) : type === 3 ? Array.from(proxyDraft.setMap.values()) : shallowCopy(target, proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.options);
  }
  if (proxyDraft) {
    proxyDraft.finalized = true;
    try {
      ensureShallowCopy2();
    } finally {
      proxyDraft.finalized = false;
    }
  } else {
    currentValue = target;
  }
  forEach(currentValue, (key, value) => {
    if (proxyDraft && isEqual(get(proxyDraft.original, key), value))
      return;
    const newValue = getCurrent(value);
    if (newValue !== value) {
      if (currentValue === target)
        ensureShallowCopy2();
      set(currentValue, key, newValue);
    }
  });
  if (type === 3) {
    const value = (_a = proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.original) !== null && _a !== void 0 ? _a : currentValue;
    return !isBaseSetInstance(value) ? new (Object.getPrototypeOf(value)).constructor(currentValue) : new Set(currentValue);
  }
  return currentValue;
}
function current(target) {
  if (!isDraft(target)) {
    throw new Error(`current() is only used for Draft, parameter: ${target}`);
  }
  return getCurrent(target);
}
var makeCreator = (arg) => {
  if (arg !== void 0 && Object.prototype.toString.call(arg) !== "[object Object]") {
    throw new Error(`Invalid options: ${String(arg)}, 'options' should be an object.`);
  }
  return function create2(arg0, arg1, arg2) {
    var _a, _b, _c;
    if (typeof arg0 === "function" && typeof arg1 !== "function") {
      return function(base2, ...args) {
        return create2(base2, (draft2) => arg0.call(this, draft2, ...args), arg1);
      };
    }
    const base = arg0;
    const mutate = arg1;
    let options = arg2;
    if (typeof arg1 !== "function") {
      options = arg1;
    }
    if (options !== void 0 && Object.prototype.toString.call(options) !== "[object Object]") {
      throw new Error(`Invalid options: ${options}, 'options' should be an object.`);
    }
    options = Object.assign(Object.assign({}, arg), options);
    const state = isDraft(base) ? current(base) : base;
    const mark = Array.isArray(options.mark) ? ((value, types) => {
      for (const mark2 of options.mark) {
        if (typeof mark2 !== "function") {
          throw new Error(`Invalid mark: ${mark2}, 'mark' should be a function.`);
        }
        const result2 = mark2(value, types);
        if (result2) {
          return result2;
        }
      }
      return;
    }) : options.mark;
    const enablePatches = (_a = options.enablePatches) !== null && _a !== void 0 ? _a : false;
    const strict = (_b = options.strict) !== null && _b !== void 0 ? _b : false;
    const enableAutoFreeze = (_c = options.enableAutoFreeze) !== null && _c !== void 0 ? _c : false;
    const _options = {
      enableAutoFreeze,
      mark,
      strict,
      enablePatches
    };
    if (!isDraftable(state, _options) && typeof state === "object" && state !== null) {
      throw new Error(`Invalid base state: create() only supports plain objects, arrays, Set, Map or using mark() to mark the state as immutable.`);
    }
    const [draft, finalize] = draftify(state, _options);
    if (typeof arg1 !== "function") {
      if (!isDraftable(state, _options)) {
        throw new Error(`Invalid base state: create() only supports plain objects, arrays, Set, Map or using mark() to mark the state as immutable.`);
      }
      return [draft, finalize];
    }
    let result;
    try {
      result = mutate(draft);
    } catch (error) {
      revokeProxy(getProxyDraft(draft));
      throw error;
    }
    const returnValue = (value) => {
      const proxyDraft = getProxyDraft(draft);
      if (!isDraft(value)) {
        if (value !== void 0 && !isEqual(value, draft) && (proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.operated)) {
          throw new Error(`Either the value is returned as a new non-draft value, or only the draft is modified without returning any value.`);
        }
        const rawReturnValue = value === null || value === void 0 ? void 0 : value[RAW_RETURN_SYMBOL];
        if (rawReturnValue) {
          const _value = rawReturnValue[0];
          if (_options.strict && typeof value === "object" && value !== null) {
            handleReturnValue({
              rootDraft: proxyDraft,
              value,
              useRawReturn: true
            });
          }
          return finalize([_value]);
        }
        if (value !== void 0) {
          if (typeof value === "object" && value !== null) {
            handleReturnValue({ rootDraft: proxyDraft, value });
          }
          return finalize([value]);
        }
      }
      if (value === draft || value === void 0) {
        return finalize([]);
      }
      const returnedProxyDraft = getProxyDraft(value);
      if (_options === returnedProxyDraft.options) {
        if (returnedProxyDraft.operated) {
          throw new Error(`Cannot return a modified child draft.`);
        }
        return finalize([current(value)]);
      }
      return finalize([value]);
    };
    if (result instanceof Promise) {
      return result.then(returnValue, (error) => {
        revokeProxy(getProxyDraft(draft));
        throw error;
      });
    }
    return returnValue(result);
  };
};
var create = makeCreator();
var constructorString = Object.prototype.constructor.toString();

// ../logix-core/src/internal/runtime/ModuleFactory.ts
import { Context as Context6, Effect as Effect11, Layer as Layer2, Schema as Schema2 } from "https://esm.sh/effect@3.19.8";

// ../logix-core/src/internal/runtime/ModuleRuntime.ts
import {
  Effect as Effect10,
  Stream as Stream3,
  SubscriptionRef as SubscriptionRef2,
  PubSub,
  Fiber,
  Exit,
  Cause as Cause5
} from "https://esm.sh/effect@3.19.8";

// ../logix-core/src/internal/runtime/core/Lifecycle.ts
import { Cause, Context, Effect, Ref } from "https://esm.sh/effect@3.19.8";
var LifecycleContext = Context.GenericTag(
  "@logix/LifecycleManager"
);
var safeRun = (label, eff) => eff.pipe(
  Effect.matchCauseEffect({
    onSuccess: () => Effect.void,
    onFailure: (cause) => Effect.logError(`[${label}] failed: ${Cause.pretty(cause)}`)
  })
);
var makeLifecycleManager = Effect.gen(
  function* () {
    const destroyRef = yield* Ref.make([]);
    const errorRef = yield* Ref.make([]);
    const registerDestroy = (effect) => Ref.update(destroyRef, (list) => [...list, effect]);
    const registerOnError = (handler) => Ref.update(errorRef, (list) => [...list, handler]);
    const runDestroy = Ref.get(destroyRef).pipe(
      Effect.flatMap(
        (effects) => Effect.forEach(
          effects,
          (effect) => safeRun("lifecycle.onDestroy", effect),
          { discard: true }
        )
      )
    );
    const notifyError = (cause, context) => Ref.get(errorRef).pipe(
      Effect.flatMap(
        (handlers) => Effect.forEach(
          handlers,
          (handler) => handler(cause, context).pipe(
            Effect.catchAllCause(
              (inner) => Effect.logError(
                `[lifecycle.onError] failed: ${Cause.pretty(inner)}`
              )
            )
          ),
          { discard: true }
        )
      )
    );
    const registerInit = (effect) => effect.pipe(
      Effect.matchCauseEffect({
        onSuccess: () => Effect.void,
        onFailure: (cause) => notifyError(cause, { phase: "lifecycle.onInit" }).pipe(
          Effect.zipRight(
            Effect.logError(
              `[lifecycle.onInit] failed: ${Cause.pretty(cause)}`
            )
          )
        )
      })
    );
    return {
      registerInit,
      registerDestroy,
      registerOnError,
      runDestroy,
      notifyError,
      hasOnErrorHandlers: Ref.get(errorRef).pipe(
        Effect.map((handlers) => handlers.length > 0)
      )
    };
  }
);

// ../logix-core/src/internal/runtime/core/DebugSink.ts
import { Cause as Cause2, Effect as Effect2, FiberRef, Layer, Logger } from "https://esm.sh/effect@3.19.8";
var currentDebugSinks = FiberRef.unsafeMake([]);
var currentRuntimeLabel = FiberRef.unsafeMake(void 0);
var browserLifecycleSeen = /* @__PURE__ */ new Set();
var browserDiagnosticSeen = /* @__PURE__ */ new Set();
var lifecycleErrorLog = (event) => {
  const moduleId = event.moduleId ?? "unknown";
  const causePretty = (() => {
    try {
      return Cause2.pretty(event.cause, {
        renderErrorCause: true
      });
    } catch {
      try {
        return JSON.stringify(event.cause, null, 2);
      } catch {
        return String(event.cause);
      }
    }
  })();
  const message = `[Logix][module=${moduleId}] lifecycle:error
${causePretty}`;
  return Effect2.logError(message).pipe(
    Effect2.annotateLogs({
      "logix.moduleId": moduleId,
      "logix.event": "lifecycle:error",
      "logix.cause": causePretty
    })
  );
};
var diagnosticLog = (event) => {
  const moduleId = event.moduleId ?? "unknown";
  const header = `[Logix][module=${moduleId}] diagnostic(${event.severity})`;
  const detail = `code=${event.code} message=${event.message}${event.actionTag ? ` action=${event.actionTag}` : ""}${event.hint ? `
hint: ${event.hint}` : ""}`;
  const msg = `${header}
${detail}`;
  const base = event.severity === "warning" ? Effect2.logWarning(msg) : event.severity === "info" ? Effect2.logInfo(msg) : Effect2.logError(msg);
  const annotations = {
    "logix.moduleId": moduleId,
    "logix.event": `diagnostic(${event.severity})`,
    "logix.diagnostic.code": event.code,
    "logix.diagnostic.message": event.message
  };
  if (event.hint) {
    annotations["logix.diagnostic.hint"] = event.hint;
  }
  if (event.actionTag) {
    annotations["logix.diagnostic.actionTag"] = event.actionTag;
  }
  return base.pipe(Effect2.annotateLogs(annotations));
};
var noopLayer = Layer.locallyScoped(currentDebugSinks, []);
var errorOnlySink = {
  record: (event) => event.type === "lifecycle:error" ? lifecycleErrorLog(event) : event.type === "diagnostic" && event.severity !== "info" ? diagnosticLog(event) : Effect2.void
};
var errorOnlyLayer = Layer.locallyScoped(currentDebugSinks, [errorOnlySink]);
var consoleSink = {
  record: (event) => event.type === "lifecycle:error" ? lifecycleErrorLog(event) : event.type === "diagnostic" ? diagnosticLog(event) : Effect2.logDebug({ debugEvent: event })
};
var consoleLayer = Layer.locallyScoped(currentDebugSinks, [consoleSink]);
var isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
var renderBrowserConsoleEvent = (event) => {
  if (typeof event.type === "string" && event.type.startsWith("trace:")) {
    const moduleId = event.moduleId ?? "unknown";
    const type = event.type;
    return Effect2.sync(() => {
      console.groupCollapsed(
        "%c[Logix]%c trace %c" + moduleId + "%c " + String(type),
        "color:#6b7280;font-weight:bold",
        // tag
        "color:#3b82f6",
        // label
        "color:#9ca3af",
        // module id
        "color:#6b7280"
        // type
      );
      console.log(event);
      console.groupEnd();
    });
  }
  if (event.type === "lifecycle:error") {
    const moduleId = event.moduleId ?? "unknown";
    const causePretty = (() => {
      try {
        return Cause2.pretty(event.cause, { renderErrorCause: true });
      } catch {
        try {
          return JSON.stringify(event.cause, null, 2);
        } catch {
          return String(event.cause);
        }
      }
    })();
    const key = `${moduleId}|${causePretty}`;
    if (browserLifecycleSeen.has(key)) {
      return Effect2.void;
    }
    browserLifecycleSeen.add(key);
    return Effect2.sync(() => {
      console.groupCollapsed(
        "%c[Logix]%c lifecycle:error %c" + moduleId,
        "color:#ef4444;font-weight:bold",
        // tag
        "color:#ef4444",
        // label
        "color:#9ca3af"
        // module id
      );
      console.error(causePretty);
      console.groupEnd();
    });
  }
  if (event.type === "diagnostic") {
    const moduleId = event.moduleId ?? "unknown";
    const detail = `code=${event.code} message=${event.message}${event.actionTag ? ` action=${event.actionTag}` : ""}${event.hint ? `
hint: ${event.hint}` : ""}`;
    const color = event.severity === "warning" ? "color:#d97706" : event.severity === "info" ? "color:#3b82f6" : "color:#ef4444";
    const label = event.severity === "warning" ? "diagnostic(warning)" : event.severity === "info" ? "diagnostic(info)" : "diagnostic(error)";
    const key = `${moduleId}|${event.code}|${event.message}`;
    if (browserDiagnosticSeen.has(key)) {
      return Effect2.void;
    }
    browserDiagnosticSeen.add(key);
    return Effect2.sync(() => {
      console.groupCollapsed(
        "%c[Logix]%c " + label + "%c module=" + moduleId,
        "color:#6b7280;font-weight:bold",
        color,
        "color:#9ca3af"
      );
      console.log(detail);
      console.groupEnd();
    });
  }
  return Effect2.void;
};
var browserConsoleSink = {
  record: (event) => {
    if (!isBrowser) {
      return event.type === "lifecycle:error" ? lifecycleErrorLog(event) : event.type === "diagnostic" ? diagnosticLog(event) : Effect2.logDebug({ debugEvent: event });
    }
    return renderBrowserConsoleEvent(event);
  }
};
var browserConsoleLayer = Layer.locallyScoped(currentDebugSinks, [browserConsoleSink]);
var browserPrettyLoggerLayer = Logger.replace(
  Logger.defaultLogger,
  Logger.prettyLogger({ mode: "browser", colors: true })
);
var record = (event) => Effect2.gen(function* () {
  const sinks = yield* FiberRef.get(currentDebugSinks);
  const runtimeLabel2 = yield* FiberRef.get(currentRuntimeLabel);
  const enriched = runtimeLabel2 && event.runtimeLabel === void 0 ? { ...event, runtimeLabel: runtimeLabel2 } : event;
  if (sinks.length > 0) {
    yield* Effect2.forEach(
      sinks,
      (sink) => sink.record(enriched),
      {
        discard: true
      }
    );
    return;
  }
  if (isBrowser) {
    yield* renderBrowserConsoleEvent(enriched);
    return;
  }
  if (enriched.type === "lifecycle:error") {
    yield* lifecycleErrorLog(enriched);
    return;
  }
  if (enriched.type === "diagnostic") {
    yield* diagnosticLog(enriched);
    return;
  }
  yield* Effect2.void;
});

// ../logix-core/src/internal/runtime/core/ReducerDiagnostics.ts
import { Cause as Cause3, Chunk, Effect as Effect3 } from "https://esm.sh/effect@3.19.8";
var makeReducerError = (_tag, tag2, moduleId) => Object.assign(
  new Error(
    _tag === "ReducerDuplicateError" ? `[ModuleRuntime] Duplicate primary reducer for tag "${tag2}". Each action tag must have at most one primary reducer.` : `[ModuleRuntime] Late primary reducer registration for tag "${tag2}". Reducers must be registered before the first dispatch of this tag.`
  ),
  {
    _tag,
    tag: tag2,
    moduleId
  }
);
var emitDiagnosticsFromCause = (cause, moduleIdFromContext) => Effect3.sync(() => {
  const defects = Chunk.toReadonlyArray(Cause3.defects(cause));
  let duplicate;
  let late;
  for (const defect of defects) {
    if (!defect || typeof defect !== "object") continue;
    const error = defect;
    if (error._tag === "ReducerDuplicateError") {
      duplicate = error;
    } else if (error._tag === "ReducerLateRegistrationError") {
      late = error;
    }
  }
  const effects = [];
  if (duplicate) {
    effects.push(
      record({
        type: "diagnostic",
        moduleId: duplicate.moduleId ?? moduleIdFromContext,
        code: "reducer::duplicate",
        severity: "error",
        message: `Primary reducer for tag "${duplicate.tag}" is already registered and cannot be redefined.`,
        hint: "\u786E\u4FDD\u6BCF\u4E2A Action Tag \u4EC5\u5B9A\u4E49\u4E00\u4E2A primary reducer\u3002\u82E5\u540C\u65F6\u5728 Module.reducers \u4E0E $.reducer \u4E2D\u5B9A\u4E49\uFF0C\u8BF7\u4FDD\u7559 Module.reducers \u7248\u672C\u6216\u5408\u5E76\u4E3A\u5355\u4E00\u5B9A\u4E49\u3002",
        actionTag: duplicate.tag
      })
    );
  }
  if (late) {
    effects.push(
      record({
        type: "diagnostic",
        moduleId: late.moduleId ?? moduleIdFromContext,
        code: "reducer::late_registration",
        severity: "error",
        message: `Primary reducer for tag "${late.tag}" was registered after actions with this tag had already been dispatched.`,
        hint: '\u8BF7\u5C06\u8BE5 reducer \u63D0\u524D\u5230 Module.make({ reducers })\uFF0C\u6216\u786E\u4FDD\u5728\u9996\u6B21 dispatch \u4E4B\u524D\u6267\u884C $.reducer("tag", ...)\u3002',
        actionTag: late.tag
      })
    );
  }
  if (effects.length === 0) {
    return Effect3.void;
  }
  let combined = Effect3.void;
  for (const eff of effects) {
    combined = combined.pipe(Effect3.zipRight(eff));
  }
  return combined;
}).pipe(Effect3.flatten);

// ../logix-core/src/internal/runtime/core/LifecycleDiagnostics.ts
import { Effect as Effect4 } from "https://esm.sh/effect@3.19.8";
var emitMissingOnErrorDiagnosticIfNeeded = (lifecycle, moduleId) => lifecycle.hasOnErrorHandlers.pipe(
  Effect4.flatMap(
    (has2) => has2 || !moduleId ? Effect4.void : record({
      type: "diagnostic",
      moduleId,
      code: "lifecycle::missing_on_error",
      severity: "warning",
      message: `Module "${moduleId}" received a lifecycle error but has no $.lifecycle.onError handler registered.`,
      hint: "\u5EFA\u8BAE\u5728\u8BE5 Module \u7684 Logic \u5F00\u5934\u6DFB\u52A0 $.lifecycle.onError((cause, context) => ...) \u4EE5\u7EDF\u4E00\u515C\u5E95\u903B\u8F91\u9519\u8BEF\u3002"
    })
  )
);

// ../logix-core/src/internal/runtime/core/LogicDiagnostics.ts
import { Cause as Cause4, Context as Context2, Effect as Effect5 } from "https://esm.sh/effect@3.19.8";

// ../logix-core/src/internal/runtime/core/env.ts
var getNodeEnv = () => {
  try {
    const env = globalThis?.process?.env;
    return typeof env?.NODE_ENV === "string" ? env.NODE_ENV : void 0;
  } catch {
    return void 0;
  }
};
var isDevEnv = () => getNodeEnv() !== "production";

// ../logix-core/src/internal/runtime/core/LogicDiagnostics.ts
var phaseDiagnosticsEnabled = () => isDevEnv();
var SERVICE_NOT_FOUND_PREFIX = "Service not found:";
var emitEnvServiceNotFoundDiagnosticIfNeeded = (cause, moduleId) => Effect5.gen(function* () {
  let pretty;
  try {
    pretty = Cause4.pretty(cause, { renderErrorCause: true });
  } catch {
    return;
  }
  if (!pretty.includes(SERVICE_NOT_FOUND_PREFIX)) {
    return;
  }
  yield* record({
    type: "diagnostic",
    moduleId,
    code: "logic::env_service_not_found",
    severity: "warning",
    message: pretty,
    hint: "Logic \u5728\u521D\u59CB\u5316\u9636\u6BB5\u5C1D\u8BD5\u8BBF\u95EE\u5C1A\u672A\u63D0\u4F9B\u7684 Env Service\uFF0C\u901A\u5E38\u662F Runtime / React \u96C6\u6210\u4E2D\u7684\u5DF2\u77E5\u521D\u59CB\u5316\u566A\u97F3\u3002\u82E5\u53EA\u5728\u5E94\u7528\u542F\u52A8\u65E9\u671F\u51FA\u73B0\u4E00\u6B21\u4E14\u540E\u7EED\u72B6\u6001\u4E0E Env \u5747\u6B63\u5E38\uFF0C\u53EF\u6682\u89C6\u4E3A\u65E0\u5BB3\uFF1B\u82E5\u6301\u7EED\u51FA\u73B0\u6216\u4F34\u968F\u4E1A\u52A1\u5F02\u5E38\uFF0C\u8BF7\u68C0\u67E5 Runtime.make / RuntimeProvider.layer \u662F\u5426\u6B63\u786E\u63D0\u4F9B\u4E86\u5BF9\u5E94 Service\u3002"
  });
  yield* record({
    type: "diagnostic",
    moduleId,
    code: "logic::invalid_phase",
    severity: "error",
    message: "$.use is not allowed before Env is fully ready.",
    hint: "setup \u6BB5\u6216 Env \u672A\u5B8C\u5168\u5C31\u7EEA\u65F6\u8BF7\u907F\u514D\u76F4\u63A5\u8BFB\u53D6 Service\uFF1B\u5EFA\u8BAE\u5C06\u5BF9 Env \u7684\u8BBF\u95EE\u79FB\u52A8\u5230 Logic \u7684 run \u6BB5\uFF0C\u6216\u901A\u8FC7 $.lifecycle.onInit \u5305\u88C5\u521D\u59CB\u5316\u6D41\u7A0B\u3002",
    kind: "env_service_not_ready"
  });
});
var LogicPhaseServiceTag = Context2.GenericTag(
  "@logix/LogicPhaseService"
);
var makeLogicPhaseError = (kind, api, phase, moduleId) => Object.assign(
  new Error(
    `[LogicPhaseError] ${api} is not allowed in ${phase} phase (kind=${kind}).`
  ),
  {
    _tag: "LogicPhaseError",
    kind,
    api,
    phase,
    moduleId
  }
);
var emitInvalidPhaseDiagnosticIfNeeded = (cause, moduleId) => Effect5.gen(function* () {
  if (!phaseDiagnosticsEnabled()) {
    return;
  }
  const allErrors = [
    ...Cause4.failures(cause),
    ...Cause4.defects(cause)
  ];
  for (const err of allErrors) {
    const logicErr = err;
    if (logicErr && logicErr._tag === "LogicPhaseError") {
      const phaseErr = logicErr;
      const hint = phaseErr.kind === "use_in_setup" || phaseErr.kind === "lifecycle_in_setup" ? "setup \u6BB5\u7981\u6B62\u8BFB\u53D6 Env/Service \u6216\u6267\u884C\u957F\u751F\u547D\u5468\u671F\u903B\u8F91\uFF0C\u8BF7\u5C06\u76F8\u5173\u8C03\u7528\u79FB\u52A8\u5230 run \u6BB5\u3002" : "\u8C03\u6574\u903B\u8F91\u5230 run \u6BB5\uFF0Csetup \u4EC5\u505A\u6CE8\u518C\u7C7B\u64CD\u4F5C\u3002";
      yield* record({
        type: "diagnostic",
        moduleId: phaseErr.moduleId ?? moduleId,
        code: "logic::invalid_phase",
        severity: "error",
        message: `${phaseErr.api ?? phaseErr.kind} is not allowed in ${phaseErr.phase} phase.`,
        hint,
        kind: phaseErr.kind
      });
      return;
    }
  }
});

// ../logix-core/src/internal/runtime/BoundApiRuntime.ts
import { Context as Context4, Effect as Effect9, Option, Schema, Stream as Stream2 } from "https://esm.sh/effect@3.19.8";

// ../logix-core/src/internal/runtime/core/LogicMiddleware.ts
var secure = (effect, meta, ...middlewares) => {
  const composed = middlewares.reduceRight((acc, mw) => mw(acc, meta), effect);
  return composed;
};

// ../logix-core/src/internal/runtime/core/FlowRuntime.ts
import { Effect as Effect6, Stream, Ref as Ref2 } from "https://esm.sh/effect@3.19.8";
var resolveEffect = (eff, payload) => typeof eff === "function" ? eff(payload) : eff;
var make = (runtime) => {
  const runEffect = (eff) => (payload) => resolveEffect(eff, payload);
  const runStreamSequential = (eff) => (stream) => Stream.runForEach(
    stream,
    (payload) => runEffect(eff)(payload)
  );
  const runStreamParallel = (eff) => (stream) => Stream.runDrain(
    stream.pipe(
      Stream.mapEffect(
        (payload) => runEffect(eff)(payload),
        { concurrency: "unbounded" }
      )
    )
  );
  return {
    fromAction: (predicate) => runtime.actions$.pipe(Stream.filter(predicate)),
    fromState: (selector) => runtime.changes(selector),
    debounce: (ms) => (stream) => Stream.debounce(stream, ms),
    throttle: (ms) => (stream) => Stream.throttle(stream, {
      cost: () => 1,
      units: 1,
      duration: ms,
      strategy: "enforce"
    }),
    filter: (predicate) => (stream) => Stream.filter(stream, predicate),
    run: (eff) => (stream) => runStreamSequential(eff)(stream),
    runParallel: (eff) => (stream) => runStreamParallel(eff)(stream),
    runLatest: (eff) => (stream) => Stream.runDrain(
      Stream.map(
        stream,
        (payload) => runEffect(eff)(payload)
      ).pipe(
        Stream.flatMap((effect) => Stream.fromEffect(effect), {
          switch: true
        })
      )
    ),
    runExhaust: (eff) => (stream) => Effect6.gen(function* () {
      const busyRef = yield* Ref2.make(false);
      const mapper = (payload) => Effect6.gen(function* () {
        const acquired = yield* Ref2.modify(
          busyRef,
          (busy) => busy ? [false, busy] : [true, true]
        );
        if (!acquired) {
          return;
        }
        try {
          yield* runEffect(eff)(payload);
        } finally {
          yield* Ref2.set(busyRef, false);
        }
      });
      return yield* Stream.runDrain(
        stream.pipe(
          Stream.mapEffect(mapper, { concurrency: "unbounded" })
        )
      );
    })
  };
};

// ../logix-core/src/internal/runtime/core/MatchBuilder.ts
import { Effect as Effect7 } from "https://esm.sh/effect@3.19.8";
var makeMatch = (value) => {
  let result;
  const chain = {
    with: (predicate, handler) => {
      if (result) return chain;
      if (predicate(value)) {
        result = handler(value);
      }
      return chain;
    },
    otherwise: (handler) => {
      if (result) return result;
      return handler(value);
    },
    exhaustive: () => {
      if (result) {
        return result;
      }
      return Effect7.dieMessage(
        "[FluentMatch] Non-exhaustive match: no pattern matched value"
      );
    }
  };
  return chain;
};
var makeMatchTag = (value) => {
  let result;
  const chain = {
    with: (t, handler) => {
      if (result) return chain;
      if (value._tag === t) {
        result = handler(value);
      }
      return chain;
    },
    otherwise: (handler) => {
      if (result) return result;
      return handler(value);
    },
    exhaustive: () => {
      if (result) {
        return result;
      }
      return Effect7.dieMessage(
        "[FluentMatchTag] Non-exhaustive match: no tag handler matched value"
      );
    }
  };
  return chain;
};

// ../logix-core/src/internal/runtime/core/Platform.ts
import { Context as Context3 } from "https://esm.sh/effect@3.19.8";
var Tag = Context3.GenericTag("@logix/Platform");

// ../logix-core/src/internal/runtime/BoundApiRuntime.ts
var globalLogicPhaseRef = {
  current: "run"
};
var LogicBuilderFactory = (runtime) => {
  const flowApi = make(runtime);
  return (stream) => {
    const builder = {
      debounce: (ms) => LogicBuilderFactory(runtime)(
        flowApi.debounce(ms)(stream)
      ),
      throttle: (ms) => LogicBuilderFactory(runtime)(
        flowApi.throttle(ms)(stream)
      ),
      filter: (predicate) => LogicBuilderFactory(runtime)(
        flowApi.filter(predicate)(stream)
      ),
      map: (f) => LogicBuilderFactory(runtime)(
        stream.pipe(Stream2.map(f))
      ),
      run: (eff) => secure(
        flowApi.run(eff)(stream),
        { name: "flow.run" }
      ),
      runLatest: (eff) => secure(
        flowApi.runLatest(eff)(stream),
        { name: "flow.runLatest" }
      ),
      runExhaust: (eff) => secure(
        flowApi.runExhaust(eff)(stream),
        { name: "flow.runExhaust" }
      ),
      runParallel: (eff) => secure(
        flowApi.runParallel(eff)(stream),
        { name: "flow.runParallel" }
      ),
      runFork: (eff) => secure(
        Effect9.forkScoped(flowApi.run(eff)(stream)),
        { name: "flow.runFork" }
      ),
      runParallelFork: (eff) => secure(
        Effect9.forkScoped(
          flowApi.runParallel(eff)(stream)
        ),
        { name: "flow.runParallelFork" }
      ),
      toStream: () => stream,
      update: (reducer) => Stream2.runForEach(
        stream,
        (payload) => Effect9.flatMap(runtime.getState, (prev) => {
          const next = reducer(prev, payload);
          return Effect9.isEffect(next) ? Effect9.flatMap(
            next,
            runtime.setState
          ) : runtime.setState(next);
        })
      ).pipe(
        Effect9.catchAllCause(
          (cause) => Effect9.logError("Flow error", cause)
        )
      ),
      mutate: (reducer) => Stream2.runForEach(
        stream,
        (payload) => Effect9.flatMap(runtime.getState, (prev) => {
          const next = create(prev, (draft) => {
            reducer(draft, payload);
          });
          return runtime.setState(next);
        })
      ).pipe(
        Effect9.catchAllCause(
          (cause) => Effect9.logError("Flow error", cause)
        )
      )
    };
    const andThen = (handlerOrEff) => {
      if (typeof handlerOrEff === "function") {
        if (handlerOrEff.length >= 2) {
          return builder.update(handlerOrEff);
        }
        return builder.run(handlerOrEff);
      }
      return builder.run(handlerOrEff);
    };
    const pipe = function() {
      const fns = arguments;
      let acc = builder;
      for (let i = 0; i < fns.length; i++) {
        acc = fns[i](acc);
      }
      return acc;
    };
    return Object.assign(builder, { pipe, andThen });
  };
};
function make2(shape, runtime, options) {
  const getPhase = options?.getPhase ?? (() => globalLogicPhaseRef.current);
  const guardRunOnly = (kind, api) => {
    const phaseService = options?.phaseService;
    const phase = phaseService?.current ?? (globalLogicPhaseRef.current === "setup" ? "setup" : getPhase());
    if (phase === "setup") {
      throw makeLogicPhaseError(
        kind,
        api,
        "setup",
        options?.moduleId
      );
    }
  };
  const flowApi = make(runtime);
  const makeIntentBuilder = (runtime_) => LogicBuilderFactory(runtime_);
  const withLifecycle = (available, missing) => Effect9.serviceOption(LifecycleContext).pipe(
    Effect9.flatMap(
      (maybe) => Option.match(maybe, {
        onSome: available,
        onNone: missing
      })
    )
  );
  const withPlatform = (invoke) => Effect9.serviceOption(Tag).pipe(
    Effect9.flatMap(
      (maybe) => Option.match(maybe, {
        onSome: invoke,
        onNone: () => Effect9.void
      })
    )
  );
  const createIntentBuilder = (stream) => makeIntentBuilder(runtime)(stream);
  const resolveModuleRuntime = (tag2) => Effect9.gen(function* () {
    const fromEnv = yield* Effect9.serviceOption(tag2);
    if (Option.isSome(fromEnv)) {
      return fromEnv.value;
    }
    const fromRegistry = getRegisteredRuntime(tag2);
    if (fromRegistry) {
      return fromRegistry;
    }
    return yield* Effect9.dieMessage(
      "[BoundApi] ModuleRuntime not found for given Module Tag. Ensure the module is provided via an application Runtime (Runtime.make) or Module.live() in the current process."
    );
  });
  const makeRemoteBoundApi = (handle) => {
    const makeRemoteOnAction = (source) => new Proxy(() => {
    }, {
      apply: (_target, _thisArg, args) => {
        const arg = args[0];
        if (typeof arg === "function") {
          return createIntentBuilder(
            source.pipe(Stream2.filter(arg))
          );
        }
        if (typeof arg === "string") {
          return createIntentBuilder(
            source.pipe(
              Stream2.filter(
                (a) => a._tag === arg || a.type === arg
              )
            )
          );
        }
        if (typeof arg === "object" && arg !== null) {
          if ("_tag" in arg) {
            return createIntentBuilder(
              source.pipe(
                Stream2.filter(
                  (a) => a._tag === arg._tag
                )
              )
            );
          }
          if (Schema.isSchema(arg)) {
            return createIntentBuilder(
              source.pipe(
                Stream2.filter((a) => {
                  const result = Schema.decodeUnknownSync(
                    arg
                  )(a);
                  return !!result;
                })
              )
            );
          }
        }
        return createIntentBuilder(source);
      },
      get: (_target, prop) => {
        if (typeof prop === "string") {
          return createIntentBuilder(
            source.pipe(
              Stream2.filter(
                (a) => a._tag === prop || a.type === prop
              )
            )
          );
        }
        return void 0;
      }
    });
    return {
      onState: (selector) => createIntentBuilder(handle.changes(selector)),
      onAction: makeRemoteOnAction(handle.actions$),
      on: (stream) => createIntentBuilder(stream),
      read: handle.read,
      actions: handle.actions,
      actions$: handle.actions$
    };
  };
  const stateApi = {
    read: runtime.getState,
    update: (f) => secure(
      Effect9.flatMap(runtime.getState, (prev) => runtime.setState(f(prev))),
      { name: "state.update", storeId: runtime.id }
    ),
    mutate: (f) => secure(
      Effect9.flatMap(runtime.getState, (prev) => {
        const next = create(prev, (draft) => {
          f(draft);
        });
        return runtime.setState(next);
      }),
      { name: "state.mutate", storeId: runtime.id }
    ),
    ref: runtime.ref
  };
  const actionsApi = new Proxy({}, {
    get: (_target, prop) => {
      if (prop === "dispatch") {
        return (a) => runtime.dispatch(a);
      }
      if (prop === "actions$") {
        return runtime.actions$;
      }
      return (payload) => runtime.dispatch({ _tag: prop, payload });
    }
  });
  const matchApi = (value) => makeMatch(value);
  const matchTagApi = (value) => makeMatchTag(value);
  const reducer = (tag2, fn) => {
    return secure(
      Effect9.sync(() => {
        const anyRuntime = runtime;
        const register = anyRuntime && anyRuntime.__registerReducer;
        if (!register) {
          throw new Error(
            "[BoundApi.reducer] Primary reducer registration is not supported by this runtime (missing internal __registerReducer hook)."
          );
        }
        register(String(tag2), fn);
      }),
      { name: "state.reducer", storeId: runtime.id }
    );
  };
  return {
    state: stateApi,
    actions: actionsApi,
    flow: flowApi,
    match: matchApi,
    matchTag: matchTagApi,
    lifecycle: {
      onInit: (eff) => {
        guardRunOnly("lifecycle_in_setup", "$.lifecycle.onInit");
        return withLifecycle(
          (manager) => manager.registerInit(eff),
          () => eff
        );
      },
      onDestroy: (eff) => withLifecycle(
        (manager) => manager.registerDestroy(eff),
        () => eff
      ),
      onError: (handler) => withLifecycle(
        (manager) => manager.registerOnError(handler),
        () => Effect9.void
      ),
      onSuspend: (eff) => withPlatform(
        (platform) => platform.lifecycle.onSuspend(
          Effect9.asVoid(eff)
        )
      ),
      onResume: (eff) => withPlatform(
        (platform) => platform.lifecycle.onResume(
          Effect9.asVoid(eff)
        )
      ),
      onReset: (eff) => withPlatform(
        (platform) => platform.lifecycle.onReset ? platform.lifecycle.onReset(
          Effect9.asVoid(eff)
        ) : Effect9.void
      )
    },
    reducer,
    use: new Proxy(() => {
    }, {
      apply: (_target, _thisArg, [arg]) => {
        guardRunOnly("use_in_setup", "$.use");
        if (Context4.isTag(arg)) {
          const candidate = arg;
          if (candidate._kind === "Module") {
            return resolveModuleRuntime(arg).pipe(
              Effect9.map((runtime2) => {
                const actionsProxy = new Proxy(
                  {},
                  {
                    get: (_target2, prop) => (payload) => runtime2.dispatch({
                      _tag: prop,
                      payload
                    })
                  }
                );
                const handle = {
                  read: (selector) => Effect9.map(runtime2.getState, selector),
                  changes: runtime2.changes,
                  dispatch: runtime2.dispatch,
                  actions$: runtime2.actions$,
                  actions: actionsProxy
                };
                return handle;
              })
            );
          }
          return arg;
        }
        return Effect9.die("BoundApi.use: unsupported argument");
      }
    }),
    useRemote: ((module) => {
      if (!Context4.isTag(module)) {
        return Effect9.die(
          "BoundApi.useRemote: expected a ModuleInstance Tag"
        );
      }
      const candidate = module;
      if (candidate._kind !== "Module") {
        return Effect9.die(
          "BoundApi.useRemote: expected a ModuleInstance with _kind = 'Module'"
        );
      }
      return resolveModuleRuntime(
        module
      ).pipe(
        Effect9.map((remoteRuntime) => {
          const actionsProxy = new Proxy(
            {},
            {
              get: (_target, prop) => (payload) => remoteRuntime.dispatch({
                _tag: prop,
                payload
              })
            }
          );
          const handle = {
            read: (selector) => Effect9.map(remoteRuntime.getState, selector),
            changes: remoteRuntime.changes,
            dispatch: remoteRuntime.dispatch,
            actions$: remoteRuntime.actions$,
            actions: actionsProxy
          };
          return makeRemoteBoundApi(handle);
        })
      );
    }),
    onAction: new Proxy(() => {
    }, {
      apply: (_target, _thisArg, args) => {
        guardRunOnly("use_in_setup", "$.onAction");
        const arg = args[0];
        if (typeof arg === "function") {
          return createIntentBuilder(
            runtime.actions$.pipe(Stream2.filter(arg))
          );
        }
        if (typeof arg === "string") {
          return createIntentBuilder(
            runtime.actions$.pipe(
              Stream2.filter((a) => a._tag === arg || a.type === arg)
            )
          );
        }
        if (typeof arg === "object" && arg !== null) {
          if ("_tag" in arg) {
            return createIntentBuilder(
              runtime.actions$.pipe(
                Stream2.filter((a) => a._tag === arg._tag)
              )
            );
          }
          if (Schema.isSchema(arg)) {
            return createIntentBuilder(
              runtime.actions$.pipe(
                Stream2.filter((a) => {
                  const result = Schema.decodeUnknownSync(
                    arg
                  )(a);
                  return !!result;
                })
              )
            );
          }
        }
        return createIntentBuilder(runtime.actions$);
      },
      get: (_target, prop) => {
        guardRunOnly("use_in_setup", "$.onAction");
        if (typeof prop === "string") {
          return createIntentBuilder(
            runtime.actions$.pipe(
              Stream2.filter(
                (a) => a._tag === prop || a.type === prop
              )
            )
          );
        }
        return void 0;
      }
    }),
    onState: (selector) => {
      guardRunOnly("use_in_setup", "$.onState");
      return createIntentBuilder(runtime.changes(selector));
    },
    on: (stream) => {
      guardRunOnly("use_in_setup", "$.on");
      return createIntentBuilder(stream);
    }
  };
}

// ../logix-core/src/internal/runtime/ModuleRuntime.ts
var runtimeRegistry = /* @__PURE__ */ new WeakMap();
var registerRuntime = (tag2, runtime) => {
  runtimeRegistry.set(
    tag2,
    runtime
  );
};
var unregisterRuntime = (tag2) => {
  runtimeRegistry.delete(tag2);
};
var getRegisteredRuntime = (tag2) => runtimeRegistry.get(
  tag2
);
var createPhaseRef = () => ({ current: "run" });
var make3 = (initialState, options = {}) => {
  const program = Effect10.gen(function* () {
    const stateRef = options.createState ? yield* options.createState : yield* SubscriptionRef2.make(initialState);
    const actionHub = options.createActionHub ? yield* options.createActionHub : yield* PubSub.unbounded();
    const lifecycle = yield* makeLifecycleManager;
    const id = Math.random().toString(36).slice(2);
    yield* record({
      type: "module:init",
      moduleId: options.moduleId,
      runtimeId: id
    });
    const initialSnapshot = yield* SubscriptionRef2.get(stateRef);
    yield* record({
      type: "state:update",
      moduleId: options.moduleId,
      state: initialSnapshot,
      runtimeId: id
    });
    const setStateInternal = (next) => SubscriptionRef2.set(stateRef, next).pipe(
      Effect10.tap(
        () => record({
          type: "state:update",
          moduleId: options.moduleId,
          state: next,
          runtimeId: id
        })
      )
    );
    const reducerMap = /* @__PURE__ */ new Map();
    if (options.reducers) {
      for (const [key, fn] of Object.entries(options.reducers)) {
        reducerMap.set(key, fn);
      }
    }
    const dispatchedTags = /* @__PURE__ */ new Set();
    const registerReducer = (tag2, fn) => {
      if (reducerMap.has(tag2)) {
        throw makeReducerError(
          "ReducerDuplicateError",
          tag2,
          options.moduleId
        );
      }
      if (dispatchedTags.has(tag2)) {
        throw makeReducerError(
          "ReducerLateRegistrationError",
          tag2,
          options.moduleId
        );
      }
      reducerMap.set(tag2, fn);
    };
    const applyPrimaryReducer = (action) => {
      const tag2 = action?._tag ?? action?.type;
      if (tag2 == null || reducerMap.size === 0) {
        return Effect10.void;
      }
      const tagKey = String(tag2);
      dispatchedTags.add(tagKey);
      const reducer = reducerMap.get(tagKey);
      if (!reducer) {
        return Effect10.void;
      }
      return SubscriptionRef2.get(stateRef).pipe(
        Effect10.flatMap((prev) => {
          const next = reducer(prev, action);
          return setStateInternal(next);
        })
      );
    };
    const runtime = {
      id,
      getState: SubscriptionRef2.get(stateRef),
      setState: setStateInternal,
      dispatch: (action) => applyPrimaryReducer(action).pipe(
        // 记录 Action 派发事件
        Effect10.zipRight(
          record({
            type: "action:dispatch",
            moduleId: options.moduleId,
            action,
            runtimeId: id
          })
        ),
        // 将 Action 发布给所有 watcher（Logic / Flow）
        Effect10.zipRight(PubSub.publish(actionHub, action))
      ),
      actions$: Stream3.fromPubSub(actionHub),
      changes: (selector) => Stream3.map(stateRef.changes, selector).pipe(Stream3.changes),
      ref: (selector) => {
        if (!selector) {
          return stateRef;
        }
        const readonlyRef = {
          get: Effect10.map(SubscriptionRef2.get(stateRef), selector),
          modify: () => Effect10.dieMessage("Cannot write to a derived ref")
        };
        const derived = {
          // SubscriptionRef 内部实现会访问 self.ref / self.pubsub / self.semaphore
          ref: readonlyRef,
          pubsub: {
            publish: () => Effect10.succeed(true)
          },
          semaphore: {
            withPermits: () => (self) => self
          },
          get: readonlyRef.get,
          modify: readonlyRef.modify,
          // 派生流：对原始 stateRef.changes 做 selector 映射 + 去重
          changes: Stream3.map(stateRef.changes, selector).pipe(
            Stream3.changes
          )
        };
        return derived;
      }
    };
    runtime.__registerReducer = registerReducer;
    if (options.tag) {
      registerRuntime(options.tag, runtime);
    }
    yield* Effect10.addFinalizer(
      () => lifecycle.runDestroy.pipe(
        Effect10.flatMap(
          () => record({
            type: "module:destroy",
            moduleId: options.moduleId,
            runtimeId: id
          })
        ),
        Effect10.tap(
          () => options.tag ? Effect10.sync(
            () => unregisterRuntime(
              options.tag
            )
          ) : Effect10.void
        )
      )
    );
    if (options.tag && options.logics?.length) {
      const moduleIdForLogs = options.moduleId ?? "unknown";
      const withRuntimeAndLifecycle = (eff, phaseRef) => {
        const withServices = Effect10.provideService(
          Effect10.provideService(
            eff,
            LifecycleContext,
            lifecycle
          ),
          options.tag,
          runtime
        );
        const annotated = Effect10.annotateLogs({
          "logix.moduleId": moduleIdForLogs
        })(withServices);
        if (!phaseRef) {
          return annotated;
        }
        const phaseService = {
          get current() {
            return phaseRef.current;
          }
        };
        return Effect10.provideService(
          annotated,
          LogicPhaseServiceTag,
          phaseService
        );
      };
      const handleLogicFailure = (cause) => {
        const phaseErrorMarker = [
          ...Cause5.failures(cause),
          ...Cause5.defects(cause)
        ].some((err) => err?._tag === "LogicPhaseError");
        const base = lifecycle.notifyError(cause, {
          phase: "logic.fork",
          moduleId: options.moduleId
        }).pipe(
          Effect10.flatMap(
            () => record({
              type: "lifecycle:error",
              moduleId: options.moduleId,
              cause,
              runtimeId: id
            })
          ),
          Effect10.tap(
            () => emitMissingOnErrorDiagnosticIfNeeded(
              lifecycle,
              options.moduleId
            )
          ),
          Effect10.tap(
            () => emitDiagnosticsFromCause(
              cause,
              options.moduleId
            )
          ),
          Effect10.tap(
            () => emitEnvServiceNotFoundDiagnosticIfNeeded(
              cause,
              options.moduleId
            )
          ),
          Effect10.tap(
            () => emitInvalidPhaseDiagnosticIfNeeded(
              cause,
              options.moduleId
            )
          )
        );
        if (phaseErrorMarker) {
          return base;
        }
        return base.pipe(Effect10.flatMap(() => Effect10.failCause(cause)));
      };
      const isLogicPlan = (value) => Boolean(
        value && typeof value === "object" && "run" in value && "setup" in value
      );
      const returnsLogicPlan = (value) => Boolean(value?.__logicPlan === true);
      const extractPhaseRef = (value) => value?.__phaseRef;
      const normalizeToPlan = (value) => isLogicPlan(value) ? Object.assign(value, {
        __phaseRef: extractPhaseRef(value) ?? createPhaseRef()
      }) : Object.assign(
        {
          setup: Effect10.void,
          run: value
        },
        { __phaseRef: extractPhaseRef(value) ?? createPhaseRef() }
      );
      for (const rawLogic of options.logics) {
        if (isLogicPlan(rawLogic)) {
          const phaseRef = extractPhaseRef(rawLogic) ?? createPhaseRef();
          const setupPhase = withRuntimeAndLifecycle(rawLogic.setup, phaseRef);
          const runPhase2 = withRuntimeAndLifecycle(rawLogic.run, phaseRef);
          phaseRef.current = "setup";
          globalLogicPhaseRef.current = "setup";
          yield* setupPhase.pipe(Effect10.catchAllCause(handleLogicFailure));
          phaseRef.current = "run";
          globalLogicPhaseRef.current = "run";
          yield* Effect10.forkScoped(
            runPhase2.pipe(Effect10.catchAllCause(handleLogicFailure))
          );
          continue;
        }
        if (returnsLogicPlan(rawLogic)) {
          const phaseRef = extractPhaseRef(rawLogic) ?? createPhaseRef();
          const makeNoopPlan = () => Object.assign(
            {
              setup: Effect10.void,
              run: Effect10.void
            },
            {
              __phaseRef: phaseRef,
              // 标记为“仅用于 phase 诊断的占位 plan”，后续不再 fork run 段，
              // 以避免在 runSync 路径上产生 AsyncFiberException。
              __skipRun: true
            }
          );
          phaseRef.current = "setup";
          globalLogicPhaseRef.current = "setup";
          const resolvedPlan = yield* withRuntimeAndLifecycle(
            rawLogic,
            phaseRef
          ).pipe(
            Effect10.matchCauseEffect({
              onSuccess: (value) => Effect10.succeed(normalizeToPlan(value)),
              onFailure: (cause) => {
                const isLogicPhaseError = [
                  ...Cause5.failures(cause),
                  ...Cause5.defects(cause)
                ].some((err) => err?._tag === "LogicPhaseError");
                if (isLogicPhaseError) {
                  return emitInvalidPhaseDiagnosticIfNeeded(
                    cause,
                    options.moduleId
                  ).pipe(
                    Effect10.zipRight(handleLogicFailure(cause)),
                    Effect10.as(makeNoopPlan())
                  );
                }
                return emitEnvServiceNotFoundDiagnosticIfNeeded(
                  cause,
                  options.moduleId
                ).pipe(
                  Effect10.zipRight(handleLogicFailure(cause)),
                  Effect10.zipRight(Effect10.failCause(cause))
                );
              }
            })
          );
          const planPhaseRef = extractPhaseRef(resolvedPlan) ?? Object.assign(resolvedPlan, { __phaseRef: phaseRef }).__phaseRef;
          const setupPhase = withRuntimeAndLifecycle(resolvedPlan.setup, planPhaseRef);
          const runPhase2 = withRuntimeAndLifecycle(resolvedPlan.run, planPhaseRef);
          const skipRun = resolvedPlan.__skipRun === true;
          planPhaseRef.current = "setup";
          globalLogicPhaseRef.current = "setup";
          yield* setupPhase.pipe(Effect10.catchAllCause(handleLogicFailure));
          if (!skipRun) {
            planPhaseRef.current = "run";
            globalLogicPhaseRef.current = "run";
            yield* Effect10.forkScoped(
              runPhase2.pipe(Effect10.catchAllCause(handleLogicFailure))
            );
          }
          continue;
        }
        const basePhaseRef = extractPhaseRef(rawLogic);
        const runPhase = withRuntimeAndLifecycle(
          rawLogic,
          basePhaseRef
        ).pipe(Effect10.catchAllCause(handleLogicFailure));
        const runFiber = yield* Effect10.forkScoped(runPhase);
        yield* Effect10.forkScoped(
          Fiber.await(runFiber).pipe(
            Effect10.flatMap(
              (exit) => Exit.match(exit, {
                onFailure: () => Effect10.void,
                onSuccess: (value) => {
                  const executePlan = (plan) => {
                    const phaseRef = extractPhaseRef(plan) ?? createPhaseRef();
                    const setupPhase = withRuntimeAndLifecycle(
                      plan.setup,
                      phaseRef
                    );
                    const runPlanPhase = withRuntimeAndLifecycle(
                      plan.run,
                      phaseRef
                    );
                    phaseRef.current = "setup";
                    globalLogicPhaseRef.current = "setup";
                    return setupPhase.pipe(
                      Effect10.catchAllCause(handleLogicFailure),
                      Effect10.tap(
                        () => Effect10.sync(() => {
                          phaseRef.current = "run";
                          globalLogicPhaseRef.current = "run";
                        })
                      ),
                      Effect10.zipRight(
                        Effect10.forkScoped(
                          runPlanPhase.pipe(
                            Effect10.catchAllCause(handleLogicFailure)
                          )
                        )
                      ),
                      Effect10.asVoid
                    );
                  };
                  if (isLogicPlan(value)) {
                    return executePlan(value);
                  }
                  if (returnsLogicPlan(value)) {
                    return withRuntimeAndLifecycle(
                      value,
                      basePhaseRef
                    ).pipe(
                      Effect10.map(normalizeToPlan),
                      Effect10.matchCauseEffect({
                        onFailure: (cause) => handleLogicFailure(cause),
                        onSuccess: (plan) => executePlan(plan)
                      })
                    );
                  }
                  return Effect10.void;
                }
              })
            )
          )
        );
      }
      yield* Effect10.yieldNow();
    }
    return runtime;
  });
  return program;
};

// ../logix-core/src/internal/runtime/ModuleFactory.ts
function Link(modules, logic) {
  return Effect11.gen(function* () {
    const handles = {};
    for (const [key, module] of Object.entries(modules)) {
      const runtime = yield* module;
      handles[key] = {
        read: (selector) => Effect11.map(runtime.getState, selector),
        changes: runtime.changes,
        dispatch: runtime.dispatch,
        actions$: runtime.actions$,
        actions: new Proxy({}, {
          get: (_target, prop) => (payload) => runtime.dispatch({ _tag: prop, payload })
        })
      };
    }
    return yield* logic(
      handles
    );
  });
}
function Module(id, def) {
  const shape = {
    stateSchema: def.state,
    actionSchema: Schema2.Union(
      ...Object.entries(def.actions).map(
        ([tag3, payload]) => Schema2.Struct({
          _tag: Schema2.Literal(tag3),
          payload
        })
      )
    ),
    actionMap: def.actions
  };
  const reducers = def.reducers && Object.fromEntries(
    Object.entries(def.reducers).map(([tag3, reducer]) => [
      tag3,
      (state, action) => (
        // 这里依赖 `_tag` 的运行时约定：只有匹配当前 tag 的 Action 会交给对应 reducer。
        reducer(
          state,
          action
        )
      )
    ])
  );
  const tag2 = Context6.GenericTag(`@logix/Module/${id}`);
  const moduleInstance = Object.assign(tag2, {
    _kind: "Module",
    id,
    shape,
    stateSchema: shape.stateSchema,
    actionSchema: shape.actionSchema,
    /**
     * 为当前 Module 构造一段 Logic 程序：
     * - 在运行时从 Context 中取出自身的 ModuleRuntime；
     * - 基于 Runtime 构造 BoundApi；
     * - 将 BoundApi 交给调用方构造业务 Logic。
     */
    logic: (build) => {
      const phaseRef = { current: "setup" };
      const phaseService = {
        get current() {
          return phaseRef.current;
        }
      };
      const logicEffect = Effect11.gen(function* () {
        const runtime = yield* tag2;
        const api = make2(shape, runtime, {
          getPhase: () => phaseRef.current,
          phaseService,
          moduleId: id
        });
        let built;
        try {
          built = build(api);
        } catch (err) {
          if (err?._tag === "LogicPhaseError") {
            return yield* Effect11.fail(err);
          }
          throw err;
        }
        if (built?.__logicPlan === true) {
          return yield* built;
        }
        const isLogicPlan = (value) => Boolean(
          value && typeof value === "object" && "setup" in value && "run" in value
        );
        const plan = isLogicPlan(built) ? built : {
          setup: Effect11.void,
          run: built
        };
        return Object.assign(plan, { __phaseRef: phaseRef });
      });
      logicEffect.__logicPlan = true;
      logicEffect.__phaseRef = phaseRef;
      return logicEffect;
    },
    /**
     * live：给定初始状态与一组 Logic，构造带 Scope 的 ModuleRuntime Layer。
     *
     * Env 约定：
     * - R 表示 Logic 运行所需的额外环境（Service / 平台等）；
     * - ModuleRuntime 本身只依赖 Scope.Scope，由 Layer.scoped 管理。
     */
    live: (initial, ...logics) => Layer2.scoped(
      tag2,
      make3(
        initial,
        {
          tag: tag2,
          logics,
          moduleId: id,
          reducers
        }
      )
    ),
    /**
     * implement：基于 Module 定义 + 初始状态 + Logic 集合，生成 ModuleImpl 蓝图。
     *
     * - R 表示 Logic 所需的 Env 类型；
     * - 返回的 ModuleImpl.layer 会携带 R 作为输入环境；
     * - 通过 withLayer/withLayers 可以逐步将 R 收敛为更具体的 Env（甚至 never）。
     */
    implement: (config) => {
      const baseLayer = moduleInstance.live(
        config.initial,
        ...config.logics || []
      );
      const processes = config.processes ?? [];
      const makeImplWithLayer = (layer2) => ({
        _tag: "ModuleImpl",
        module: moduleInstance,
        layer: layer2,
        processes,
        withLayer: (extra) => {
          const provided = layer2.pipe(
            Layer2.provide(
              extra
            )
          );
          const merged = Layer2.mergeAll(
            provided,
            extra
          );
          return makeImplWithLayer(merged);
        },
        withLayers: (...extras) => extras.reduce(
          (implAcc, extra) => implAcc.withLayer(extra),
          makeImplWithLayer(
            layer2
          )
        )
      });
      const initialImpl = makeImplWithLayer(
        baseLayer
      );
      const imports = config.imports ?? [];
      const finalImpl = imports.reduce((implAcc, item) => {
        const layer2 = item._tag === "ModuleImpl" ? item.layer : item;
        return implAcc.withLayer(layer2);
      }, initialImpl);
      return finalImpl;
    }
  });
  return moduleInstance;
}

// ../logix-core/src/Module.ts
var Reducer = {
  mutate: (mutator) => (state, action) => create(state, (draft) => {
    mutator(draft, action);
  })
};
var makeImpl = (id, def) => Module(id, def);
var make4 = (id, def) => makeImpl(id, def);

// ../logix-core/src/State.ts
var State_exports = {};

// ../logix-core/src/Actions.ts
var Actions_exports = {};

// ../logix-core/src/Logic.ts
var Logic_exports = {};
__export(Logic_exports, {
  RuntimeTag: () => RuntimeTag,
  of: () => of,
  secure: () => secure
});
import { Context as Context7 } from "https://esm.sh/effect@3.19.8";
var RuntimeTag = Context7.GenericTag("@logix/Runtime");
function of(eff) {
  return eff;
}

// ../logix-core/src/Bound.ts
var Bound_exports = {};
__export(Bound_exports, {
  make: () => make5
});
function make5(shape, runtime) {
  return make2(shape, runtime);
}

// ../logix-core/src/Link.ts
var Link_exports = {};
__export(Link_exports, {
  make: () => make6
});
function make6(config, logic) {
  const linkId = config.id ?? [...config.modules].map((m) => m.id).sort().join("~");
  const modulesRecord = /* @__PURE__ */ Object.create(null);
  for (const module of config.modules) {
    ;
    modulesRecord[module.id] = module;
  }
  const effect = Link(
    modulesRecord,
    logic
  );
  effect._linkId = linkId;
  return effect;
}

// ../logix-core/src/Flow.ts
var Flow_exports = {};
__export(Flow_exports, {
  make: () => make7
});
var make7 = make;

// ../logix-core/src/MatchBuilder.ts
var MatchBuilder_exports2 = {};
__export(MatchBuilder_exports2, {
  makeMatch: () => makeMatch2,
  makeMatchTag: () => makeMatchTag2
});
var makeMatch2 = makeMatch;
var makeMatchTag2 = makeMatchTag;

// ../logix-core/src/Runtime.ts
var Runtime_exports = {};
__export(Runtime_exports, {
  make: () => make8
});
import { Layer as Layer5 } from "https://esm.sh/effect@3.19.8";

// ../logix-core/src/internal/runtime/AppRuntime.ts
import { Effect as Effect13, Layer as Layer3, ManagedRuntime } from "https://esm.sh/effect@3.19.8";
var getTagKey = (tag2) => {
  const anyTag = tag2;
  if (typeof anyTag.key === "string") {
    return anyTag.key;
  }
  if (typeof anyTag._id === "string") {
    return anyTag._id;
  }
  if (typeof anyTag.toString === "function") {
    return anyTag.toString();
  }
  return "[unknown-tag]";
};
var buildTagIndex = (entries) => {
  const index = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const ownerId = String(entry.module.id);
    const moduleTag = entry.module;
    const moduleKey = getTagKey(moduleTag);
    const moduleInfo = {
      key: moduleKey,
      tag: moduleTag,
      ownerModuleId: ownerId,
      source: "module"
    };
    const existingModuleInfos = index.get(moduleKey);
    if (existingModuleInfos) {
      existingModuleInfos.push(moduleInfo);
    } else {
      index.set(moduleKey, [moduleInfo]);
    }
    if (entry.serviceTags && entry.serviceTags.length > 0) {
      for (const tag2 of entry.serviceTags) {
        const key = getTagKey(tag2);
        const info = {
          key,
          tag: tag2,
          ownerModuleId: ownerId,
          source: "service"
        };
        const existingInfos = index.get(key);
        if (existingInfos) {
          existingInfos.push(info);
        } else {
          index.set(key, [info]);
        }
      }
    }
  }
  return index;
};
var validateTags = (entries) => {
  const index = buildTagIndex(entries);
  const collisions = [];
  for (const [key, infos] of index) {
    if (infos.length <= 1) {
      continue;
    }
    const owners = /* @__PURE__ */ new Set();
    for (const info of infos) {
      owners.add(info.ownerModuleId);
    }
    if (owners.size > 1) {
      collisions.push({ key, conflicts: infos });
    }
  }
  if (collisions.length === 0) {
    return;
  }
  const message = "[Logix] Tag collision detected:\n" + collisions.map((c) => {
    const header = `- key: ${c.key}`;
    const lines = c.conflicts.map(
      (i) => `  - owner: ${i.ownerModuleId}, source: ${i.source}`
    );
    return [header, ...lines].join("\n");
  }).join("\n");
  const error = Object.assign(new Error(message), {
    _tag: "TagCollisionError",
    collisions
  });
  throw error;
};
var makeApp = (config) => {
  const seenIds = /* @__PURE__ */ new Set();
  for (const entry of config.modules) {
    const id = String(entry.module.id);
    if (seenIds.has(id)) {
      throw new Error(
        `[Logix] Duplicate Module ID/Tag detected: "${id}". 
Ensure all modules in the application Runtime have unique IDs.`
      );
    }
    seenIds.add(id);
  }
  validateTags(config.modules);
  const moduleLayers = config.modules.map(
    (entry) => (
      // 确保每个模块层都能看到 App 级 Env（config.layer），避免在初始化阶段找不到 Root Env。
      Layer3.provide(entry.layer, config.layer)
    )
  );
  const envLayer = moduleLayers.length > 0 ? Layer3.mergeAll(config.layer, ...moduleLayers) : config.layer;
  const finalLayer = Layer3.unwrapScoped(
    Effect13.gen(function* () {
      const scope = yield* Effect13.scope;
      const env = yield* Layer3.buildWithScope(envLayer, scope);
      yield* Effect13.forEach(
        config.processes,
        (process2) => Effect13.forkScoped(
          Effect13.provide(
            config.onError ? Effect13.catchAllCause(process2, config.onError) : process2,
            env
          )
        )
      );
      return Layer3.succeedContext(env);
    })
  );
  return {
    definition: config,
    layer: finalLayer,
    makeRuntime: () => ManagedRuntime.make(finalLayer)
  };
};
var provide = (module, resource) => {
  const layer2 = isLayer(resource) ? resource : Layer3.succeed(
    module,
    resource
  );
  return { module, layer: layer2 };
};
var isLayer = (value) => typeof value === "object" && value !== null && Layer3.LayerTypeId in value;

// ../logix-core/src/Debug.ts
var Debug_exports = {};
__export(Debug_exports, {
  internal: () => internal2,
  layer: () => layer,
  makeModuleInstanceCounterSink: () => makeModuleInstanceCounterSink,
  makeRingBufferSink: () => makeRingBufferSink,
  noopLayer: () => noopLayer2,
  record: () => record2,
  replace: () => replace,
  runtimeLabel: () => runtimeLabel,
  traceLayer: () => traceLayer,
  withPrettyLogger: () => withPrettyLogger
});
import { Effect as Effect14, Layer as Layer4, Logger as Logger2 } from "https://esm.sh/effect@3.19.8";
var internal2 = {
  currentDebugSinks,
  currentRuntimeLabel
};
var makeModuleInstanceCounterSink = () => {
  const counts = /* @__PURE__ */ new Map();
  const sink = {
    record: (event) => Effect14.sync(() => {
      if (event.type === "module:init") {
        const moduleId = event.moduleId ?? "unknown";
        const runtimeLabel2 = "runtimeLabel" in event && event.runtimeLabel ? event.runtimeLabel : "unknown";
        const key = `${runtimeLabel2}::${moduleId}`;
        const prev = counts.get(key) ?? 0;
        counts.set(key, prev + 1);
        return;
      }
      if (event.type === "module:destroy") {
        const moduleId = event.moduleId ?? "unknown";
        const runtimeLabel2 = "runtimeLabel" in event && event.runtimeLabel ? event.runtimeLabel : "unknown";
        const key = `${runtimeLabel2}::${moduleId}`;
        const prev = counts.get(key) ?? 0;
        const next = prev - 1;
        if (next <= 0) {
          counts.delete(key);
        } else {
          counts.set(key, next);
        }
      }
    })
  };
  const getSnapshot = () => new Map(counts);
  return { sink, getSnapshot };
};
var makeRingBufferSink = (capacity = 1e3) => {
  const buffer = [];
  const sink = {
    record: (event) => Effect14.sync(() => {
      if (capacity <= 0) {
        return;
      }
      if (buffer.length >= capacity) {
        buffer.shift();
      }
      buffer.push(event);
    })
  };
  const getSnapshot = () => buffer.slice();
  const clear = () => {
    buffer.length = 0;
  };
  return { sink, getSnapshot, clear };
};
var record2 = record;
var noopLayer2 = noopLayer;
var resolveMode = (mode) => {
  if (mode && mode !== "auto") {
    return mode;
  }
  try {
    if (typeof process !== "undefined" && process != null && typeof process.env !== "undefined" && false) {
      return "prod";
    }
  } catch {
  }
  return "dev";
};
var layer = (options) => {
  const mode = resolveMode(options?.mode);
  switch (mode) {
    case "off":
      return noopLayer;
    case "prod":
      return errorOnlyLayer;
    case "dev":
    case "auto": {
      return browserConsoleLayer;
    }
  }
};
var withPrettyLogger = (base, options) => Layer4.merge(
  base,
  Logger2.replace(
    Logger2.defaultLogger,
    Logger2.prettyLogger(options)
  )
);
var replace = (sinks) => Layer4.locallyScoped(
  internal2.currentDebugSinks,
  sinks
);
var runtimeLabel = (label) => Layer4.fiberRefLocallyScopedWith(
  internal2.currentRuntimeLabel,
  () => label
);
var isLayer2 = (value) => typeof value === "object" && value !== null && "_tag" in value;
function traceLayer(baseOrHandler, maybeOnTrace) {
  const hasBase = isLayer2(baseOrHandler);
  const base = hasBase ? baseOrHandler : Layer4.empty;
  const onTrace = hasBase ? maybeOnTrace : baseOrHandler;
  const traceSink = {
    record: (event) => typeof event.type === "string" && event.type.startsWith("trace:") ? onTrace ? onTrace(event) : Effect14.logDebug({ traceEvent: event }) : Effect14.void
  };
  const appendTrace = Layer4.fiberRefLocallyScopedWith(
    currentDebugSinks,
    (sinks) => [...sinks, traceSink]
  );
  return Layer4.merge(base, appendTrace);
}

// ../logix-core/src/Runtime.ts
var make8 = (rootImpl, options) => {
  const baseLayer = options?.layer ?? Layer5.empty;
  const appLayer = options?.label != null ? Layer5.mergeAll(
    runtimeLabel(options.label),
    baseLayer
  ) : baseLayer;
  const appConfig = {
    layer: appLayer,
    modules: [provide(rootImpl.module, rootImpl.layer)],
    processes: rootImpl.processes ?? [],
    onError: options?.onError
  };
  const app = makeApp(appConfig);
  return app.makeRuntime();
};

// ../logix-core/src/Platform.ts
var Platform_exports2 = {};
__export(Platform_exports2, {
  NoopPlatform: () => NoopPlatform,
  NoopPlatformLayer: () => NoopPlatformLayer,
  defaultLayer: () => defaultLayer,
  tag: () => tag
});
import { Effect as Effect16, Layer as Layer6 } from "https://esm.sh/effect@3.19.8";
var tag = Tag;
var NoopPlatform = class {
  constructor() {
    this.lifecycle = {
      onSuspend: (_eff) => Effect16.void,
      onResume: (_eff) => Effect16.void,
      onReset: (_eff) => Effect16.void
    };
  }
};
var NoopPlatformLayer = Layer6.succeed(
  tag,
  new NoopPlatform()
);
var defaultLayer = NoopPlatformLayer;
export {
  Actions_exports as Actions,
  Bound_exports as Bound,
  Debug_exports as Debug,
  Flow_exports as Flow,
  Link_exports as Link,
  Logic_exports as Logic,
  MatchBuilder_exports2 as MatchBuilder,
  Module_exports as Module,
  Platform_exports2 as Platform,
  Runtime_exports as Runtime,
  State_exports as State,
  internal2 as internal,
  layer,
  makeModuleInstanceCounterSink,
  makeRingBufferSink,
  noopLayer2 as noopLayer,
  record2 as record,
  replace,
  runtimeLabel,
  traceLayer,
  withPrettyLogger
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vbG9naXgtY29yZS9zcmMvTW9kdWxlLnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL2ludGVyZmFjZS50cyIsICIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vbXV0YXRpdmVAMS4zLjAvbm9kZV9tb2R1bGVzL211dGF0aXZlL3NyYy9jb25zdGFudC50cyIsICIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vbXV0YXRpdmVAMS4zLjAvbm9kZV9tb2R1bGVzL211dGF0aXZlL3NyYy9pbnRlcm5hbC50cyIsICIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vbXV0YXRpdmVAMS4zLjAvbm9kZV9tb2R1bGVzL211dGF0aXZlL3NyYy91dGlscy9wcm90by50cyIsICIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vbXV0YXRpdmVAMS4zLjAvbm9kZV9tb2R1bGVzL211dGF0aXZlL3NyYy91dGlscy9kcmFmdC50cyIsICIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vbXV0YXRpdmVAMS4zLjAvbm9kZV9tb2R1bGVzL211dGF0aXZlL3NyYy91dGlscy9jb3B5LnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL3V0aWxzL21hcmsudHMiLCAiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL211dGF0aXZlQDEuMy4wL25vZGVfbW9kdWxlcy9tdXRhdGl2ZS9zcmMvdXRpbHMvZGVlcEZyZWV6ZS50cyIsICIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vbXV0YXRpdmVAMS4zLjAvbm9kZV9tb2R1bGVzL211dGF0aXZlL3NyYy91dGlscy9mb3JFYWNoLnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL3V0aWxzL2ZpbmFsaXplLnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL3BhdGNoLnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL3Vuc2FmZS50cyIsICIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vbXV0YXRpdmVAMS4zLjAvbm9kZV9tb2R1bGVzL211dGF0aXZlL3NyYy9tYXAudHMiLCAiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL211dGF0aXZlQDEuMy4wL25vZGVfbW9kdWxlcy9tdXRhdGl2ZS9zcmMvc2V0LnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL2RyYWZ0LnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL2RyYWZ0aWZ5LnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL2N1cnJlbnQudHMiLCAiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL211dGF0aXZlQDEuMy4wL25vZGVfbW9kdWxlcy9tdXRhdGl2ZS9zcmMvbWFrZUNyZWF0b3IudHMiLCAiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL211dGF0aXZlQDEuMy4wL25vZGVfbW9kdWxlcy9tdXRhdGl2ZS9zcmMvY3JlYXRlLnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL2FwcGx5LnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL29yaWdpbmFsLnRzIiwgIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tdXRhdGl2ZUAxLjMuMC9ub2RlX21vZHVsZXMvbXV0YXRpdmUvc3JjL3Jhd1JldHVybi50cyIsICIuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vbXV0YXRpdmVAMS4zLjAvbm9kZV9tb2R1bGVzL211dGF0aXZlL3NyYy91dGlscy9tYXJrZXIudHMiLCAiLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL211dGF0aXZlQDEuMy4wL25vZGVfbW9kdWxlcy9tdXRhdGl2ZS9zcmMvdXRpbHMvY2FzdC50cyIsICIuLi8uLi8uLi9sb2dpeC1jb3JlL3NyYy9pbnRlcm5hbC9ydW50aW1lL01vZHVsZUZhY3RvcnkudHMiLCAiLi4vLi4vLi4vbG9naXgtY29yZS9zcmMvaW50ZXJuYWwvcnVudGltZS9Nb2R1bGVSdW50aW1lLnRzIiwgIi4uLy4uLy4uL2xvZ2l4LWNvcmUvc3JjL2ludGVybmFsL3J1bnRpbWUvY29yZS9MaWZlY3ljbGUudHMiLCAiLi4vLi4vLi4vbG9naXgtY29yZS9zcmMvaW50ZXJuYWwvcnVudGltZS9jb3JlL0RlYnVnU2luay50cyIsICIuLi8uLi8uLi9sb2dpeC1jb3JlL3NyYy9pbnRlcm5hbC9ydW50aW1lL2NvcmUvUmVkdWNlckRpYWdub3N0aWNzLnRzIiwgIi4uLy4uLy4uL2xvZ2l4LWNvcmUvc3JjL2ludGVybmFsL3J1bnRpbWUvY29yZS9MaWZlY3ljbGVEaWFnbm9zdGljcy50cyIsICIuLi8uLi8uLi9sb2dpeC1jb3JlL3NyYy9pbnRlcm5hbC9ydW50aW1lL2NvcmUvTG9naWNEaWFnbm9zdGljcy50cyIsICIuLi8uLi8uLi9sb2dpeC1jb3JlL3NyYy9pbnRlcm5hbC9ydW50aW1lL2NvcmUvZW52LnRzIiwgIi4uLy4uLy4uL2xvZ2l4LWNvcmUvc3JjL2ludGVybmFsL3J1bnRpbWUvQm91bmRBcGlSdW50aW1lLnRzIiwgIi4uLy4uLy4uL2xvZ2l4LWNvcmUvc3JjL2ludGVybmFsL3J1bnRpbWUvY29yZS9Mb2dpY01pZGRsZXdhcmUudHMiLCAiLi4vLi4vLi4vbG9naXgtY29yZS9zcmMvaW50ZXJuYWwvcnVudGltZS9jb3JlL0Zsb3dSdW50aW1lLnRzIiwgIi4uLy4uLy4uL2xvZ2l4LWNvcmUvc3JjL2ludGVybmFsL3J1bnRpbWUvY29yZS9NYXRjaEJ1aWxkZXIudHMiLCAiLi4vLi4vLi4vbG9naXgtY29yZS9zcmMvaW50ZXJuYWwvcnVudGltZS9jb3JlL1BsYXRmb3JtLnRzIiwgIi4uLy4uLy4uL2xvZ2l4LWNvcmUvc3JjL1N0YXRlLnRzIiwgIi4uLy4uLy4uL2xvZ2l4LWNvcmUvc3JjL0FjdGlvbnMudHMiLCAiLi4vLi4vLi4vbG9naXgtY29yZS9zcmMvTG9naWMudHMiLCAiLi4vLi4vLi4vbG9naXgtY29yZS9zcmMvQm91bmQudHMiLCAiLi4vLi4vLi4vbG9naXgtY29yZS9zcmMvTGluay50cyIsICIuLi8uLi8uLi9sb2dpeC1jb3JlL3NyYy9GbG93LnRzIiwgIi4uLy4uLy4uL2xvZ2l4LWNvcmUvc3JjL01hdGNoQnVpbGRlci50cyIsICIuLi8uLi8uLi9sb2dpeC1jb3JlL3NyYy9SdW50aW1lLnRzIiwgIi4uLy4uLy4uL2xvZ2l4LWNvcmUvc3JjL2ludGVybmFsL3J1bnRpbWUvQXBwUnVudGltZS50cyIsICIuLi8uLi8uLi9sb2dpeC1jb3JlL3NyYy9EZWJ1Zy50cyIsICIuLi8uLi8uLi9sb2dpeC1jb3JlL3NyYy9QbGF0Zm9ybS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgRWZmZWN0LCBMYXllciwgU2NoZW1hIH0gZnJvbSBcImVmZmVjdFwiXG5pbXBvcnQgeyBjcmVhdGUgfSBmcm9tIFwibXV0YXRpdmVcIlxuaW1wb3J0ICogYXMgTG9naWMgZnJvbSBcIi4vTG9naWMuanNcIlxuaW1wb3J0ICogYXMgTW9kdWxlRmFjdG9yeSBmcm9tIFwiLi9pbnRlcm5hbC9ydW50aW1lL01vZHVsZUZhY3RvcnkuanNcIlxuaW1wb3J0IHR5cGUge1xuICBBY3Rpb25zRnJvbU1hcCxcbiAgQW55TW9kdWxlU2hhcGUsXG4gIEFueVNjaGVtYSxcbiAgQm91bmRBcGksXG4gIEFjdGlvbk9mLFxuICBNb2R1bGVJbXBsLFxuICBNb2R1bGVJbnN0YW5jZSxcbiAgTW9kdWxlTG9naWMsXG4gIE1vZHVsZVNoYXBlLFxuICBNb2R1bGVSdW50aW1lLFxuICBNb2R1bGVUYWcsXG4gIE1vZHVsZUhhbmRsZSxcbiAgTW9kdWxlSGFuZGxlVW5pb24sXG4gIFJlZHVjZXJzRnJvbU1hcCxcbiAgU3RhdGVPZixcbn0gZnJvbSBcIi4vaW50ZXJuYWwvbW9kdWxlLmpzXCJcblxuLyoqXG4gKiBNb2R1bGUgLyBNb2R1bGVSdW50aW1lIC8gTW9kdWxlSW1wbCBcdTdCNDlcdTY4MzhcdTVGQzNcdTdDN0JcdTU3OEJcdTVCOUFcdTRFNDlcdTc2ODRcdTUxNkNcdTVGMDBcdTUxRkFcdTUzRTNcdTMwMDJcbiAqXG4gKiBcdTRFMEUgZG9jcy9zcGVjcy9ydW50aW1lLWxvZ2l4L2NvcmUvMDItbW9kdWxlLWFuZC1sb2dpYy1hcGkubWQgXHU0RkREXHU2MzAxXHU1QkY5XHU5RjUwXHUzMDAyXG4gKiBcdTUxNzdcdTRGNTNcdTdDN0JcdTU3OEJcdTVCOUFcdTRFNDlcdTk2QzZcdTRFMkRcdTU3MjggaW50ZXJuYWwvbW9kdWxlLnRzIFx1NEUyRFx1RkYwQ1x1NjcyQ1x1NkEyMVx1NTc1N1x1OEQxRlx1OEQyM1x1N0VDNFx1NTQwOFx1NURFNVx1NTM4Mlx1NUI5RVx1NzNCMFx1MzAwMlxuICovXG5leHBvcnQgdHlwZSB7XG4gIEFueVNjaGVtYSxcbiAgQW55TW9kdWxlU2hhcGUsXG4gIE1vZHVsZVNoYXBlLFxuICBNb2R1bGVMb2dpYyxcbiAgTW9kdWxlSW5zdGFuY2UsXG4gIE1vZHVsZUltcGwsXG4gIE1vZHVsZVJ1bnRpbWUsXG4gIE1vZHVsZVRhZyxcbiAgTW9kdWxlSGFuZGxlLFxuICBNb2R1bGVIYW5kbGVVbmlvbixcbiAgU3RhdGVPZixcbiAgQWN0aW9uc0Zyb21NYXAsXG4gIFJlZHVjZXJzRnJvbU1hcCxcbiAgQm91bmRBcGksXG4gIEFjdGlvbk9mLFxufSBmcm9tIFwiLi9pbnRlcm5hbC9tb2R1bGUuanNcIlxuXG4vKipcbiAqIFJlZHVjZXIgXHU1RTJFXHU1MkE5XHU1REU1XHU1MTc3XHVGRjFBXG4gKiAtIGBSZWR1Y2VyLm11dGF0ZWAgXHU2M0QwXHU0RjlCXHU0RTBFIGAkLnN0YXRlLm11dGF0ZWAgXHU0RTAwXHU4MUY0XHU3Njg0IG11dGF0aXZlIFx1OThDRVx1NjgzQ1x1NTE5OVx1NkNENVx1RkYxQlxuICogLSBcdTkwMUFcdThGQzdcdTUxODVcdTkwRThcdTU3RkFcdTRFOEUgbXV0YXRpdmUgXHU3Njg0XHU0RTBEXHU1M0VGXHU1M0Q4XHU2NkY0XHU2NUIwXHVGRjBDXHU1QzA2XHUzMDBDXHU1QzMxXHU1NzMwXHU0RkVFXHU2NTM5IGRyYWZ0XHUzMDBEXHU2NjIwXHU1QzA0XHU0RTNBXHU3RUFGIGAoc3RhdGUsIGFjdGlvbikgPT4gc3RhdGVgIFx1NTFGRFx1NjU3MFx1MzAwMlxuICpcbiAqIFx1NzUyOFx1NkNENVx1NzkzQVx1NEY4Qlx1RkYxQVxuICpcbiAqICAgY29uc3QgQ291bnRlciA9IExvZ2l4Lk1vZHVsZS5tYWtlKFwiQ291bnRlclwiLCB7XG4gKiAgICAgc3RhdGU6IENvdW50ZXJTdGF0ZSxcbiAqICAgICBhY3Rpb25zOiBDb3VudGVyQWN0aW9ucyxcbiAqICAgICByZWR1Y2Vyczoge1xuICogICAgICAgaW5jOiBMb2dpeC5Nb2R1bGUuUmVkdWNlci5tdXRhdGUoKGRyYWZ0LCBfYWN0aW9uKSA9PiB7XG4gKiAgICAgICAgIGRyYWZ0LmNvdW50ICs9IDFcbiAqICAgICAgIH0pLFxuICogICAgIH0sXG4gKiAgIH0pXG4gKlxuICogICB5aWVsZCogJC5yZWR1Y2VyKFxuICogICAgIFwic2V0VmFsdWVcIixcbiAqICAgICBMb2dpeC5Nb2R1bGUuUmVkdWNlci5tdXRhdGUoKGRyYWZ0LCBhY3Rpb24pID0+IHtcbiAqICAgICAgIGRyYWZ0LnZhbHVlID0gYWN0aW9uLnBheWxvYWRcbiAqICAgICB9KSxcbiAqICAgKVxuICovXG5leHBvcnQgY29uc3QgUmVkdWNlciA9IHtcbiAgbXV0YXRlOiA8UywgQT4oXG4gICAgbXV0YXRvcjogKGRyYWZ0OiBMb2dpYy5EcmFmdDxTPiwgYWN0aW9uOiBBKSA9PiB2b2lkXG4gICk6ICgoc3RhdGU6IFMsIGFjdGlvbjogQSkgPT4gUykgPT5cbiAgICAoc3RhdGUsIGFjdGlvbikgPT5cbiAgICAgIGNyZWF0ZShzdGF0ZSBhcyBTLCAoZHJhZnQpID0+IHtcbiAgICAgICAgbXV0YXRvcihkcmFmdCBhcyBMb2dpYy5EcmFmdDxTPiwgYWN0aW9uKVxuICAgICAgfSkgYXMgUyxcbn1cblxuLyoqXG4gKiBcdTdCODBcdTUzMTZcdTc2ODQgU2hhcGUgXHU1QjlBXHU0RTQ5XHU1MkE5XHU2MjRCXHVGRjBDXHU0RTEzXHU0RTNBIEFjdGlvbiBNYXAgXHU4QkJFXHU4QkExXHUzMDAyXG4gKiBAZXhhbXBsZSB0eXBlIE15U2hhcGUgPSBTaGFwZTx0eXBlb2YgTXlTdGF0ZSwgdHlwZW9mIE15QWN0aW9uTWFwPlxuICovXG5leHBvcnQgdHlwZSBTaGFwZTxcbiAgUyBleHRlbmRzIEFueVNjaGVtYSxcbiAgTSBleHRlbmRzIFJlY29yZDxzdHJpbmcsIEFueVNjaGVtYT5cbj4gPSBNb2R1bGVTaGFwZTxTLCBTY2hlbWEuU2NoZW1hPEFjdGlvbnNGcm9tTWFwPE0+PiwgTT5cblxuY29uc3QgbWFrZUltcGwgPSA8XG4gIElkIGV4dGVuZHMgc3RyaW5nLFxuICBTU2NoZW1hIGV4dGVuZHMgQW55U2NoZW1hLFxuICBBTWFwIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgQW55U2NoZW1hPlxuPihcbiAgaWQ6IElkLFxuICBkZWY6IHtcbiAgICByZWFkb25seSBzdGF0ZTogU1NjaGVtYVxuICAgIHJlYWRvbmx5IGFjdGlvbnM6IEFNYXBcbiAgICByZWFkb25seSByZWR1Y2Vycz86IFJlZHVjZXJzRnJvbU1hcDxTU2NoZW1hLCBBTWFwPlxuICB9XG4pOiBNb2R1bGVJbnN0YW5jZTxcbiAgSWQsXG4gIE1vZHVsZVNoYXBlPFNTY2hlbWEsIFNjaGVtYS5TY2hlbWE8QWN0aW9uc0Zyb21NYXA8QU1hcD4+LCBBTWFwPlxuPiA9PlxuICBNb2R1bGVGYWN0b3J5Lk1vZHVsZShpZCwgZGVmKSBhcyBNb2R1bGVJbnN0YW5jZTxcbiAgICBJZCxcbiAgICBNb2R1bGVTaGFwZTxTU2NoZW1hLCBTY2hlbWEuU2NoZW1hPEFjdGlvbnNGcm9tTWFwPEFNYXA+PiwgQU1hcD5cbiAgPlxuXG4vKipcbiAqIE1vZHVsZS5tYWtlXHVGRjFBXG4gKiAtIFx1NEVFNVx1N0VEOVx1NUI5QSBpZCBcdTRFMEUgc3RhdGUvYWN0aW9ucy9yZWR1Y2VycyBcdTVCOUFcdTRFNDlcdTRFMDBcdTRFMkFcdTk4ODZcdTU3REZcdTZBMjFcdTU3NTdcdUZGMUJcbiAqIC0gXHU4RkQ0XHU1NkRFXHU3Njg0IE1vZHVsZUluc3RhbmNlIFx1NjVFMlx1NjYyRiBDb250ZXh0LlRhZ1x1RkYwQ1x1NTNDOFx1NjQzQVx1NUUyNiBTaGFwZSBcdTRFMEVcdTVERTVcdTUzODJcdTgwRkRcdTUyOUJcdTMwMDJcbiAqXG4gKiBcdTUxNzhcdTU3OEJcdTc1MjhcdTZDRDVcdUZGMUFcbiAqXG4gKiAgIGNvbnN0IENvdW50ZXIgPSBMb2dpeC5Nb2R1bGUubWFrZShcIkNvdW50ZXJcIiwge1xuICogICAgIHN0YXRlOiBDb3VudGVyU3RhdGUsXG4gKiAgICAgYWN0aW9uczogQ291bnRlckFjdGlvbnMsXG4gKiAgIH0pXG4gKi9cbmV4cG9ydCBjb25zdCBtYWtlID0gPFxuICBJZCBleHRlbmRzIHN0cmluZyxcbiAgU1NjaGVtYSBleHRlbmRzIEFueVNjaGVtYSxcbiAgQU1hcCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIEFueVNjaGVtYT5cbj4oXG4gIGlkOiBJZCxcbiAgZGVmOiB7XG4gICAgcmVhZG9ubHkgc3RhdGU6IFNTY2hlbWFcbiAgICByZWFkb25seSBhY3Rpb25zOiBBTWFwXG4gICAgcmVhZG9ubHkgcmVkdWNlcnM/OiBSZWR1Y2Vyc0Zyb21NYXA8U1NjaGVtYSwgQU1hcD5cbiAgfVxuKTogTW9kdWxlSW5zdGFuY2U8XG4gIElkLFxuICBNb2R1bGVTaGFwZTxTU2NoZW1hLCBTY2hlbWEuU2NoZW1hPEFjdGlvbnNGcm9tTWFwPEFNYXA+PiwgQU1hcD5cbj4gPT4gbWFrZUltcGwoaWQsIGRlZilcbiIsICJpbXBvcnQgeyBkYXRhVHlwZXMgfSBmcm9tICcuL2NvbnN0YW50JztcblxuZXhwb3J0IGNvbnN0IGVudW0gRHJhZnRUeXBlIHtcbiAgT2JqZWN0LFxuICBBcnJheSxcbiAgTWFwLFxuICBTZXQsXG59XG5cbmV4cG9ydCBjb25zdCBPcGVyYXRpb24gPSB7XG4gIFJlbW92ZTogJ3JlbW92ZScsXG4gIFJlcGxhY2U6ICdyZXBsYWNlJyxcbiAgQWRkOiAnYWRkJyxcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIERhdGFUeXBlID0ga2V5b2YgdHlwZW9mIGRhdGFUeXBlcztcblxuZXhwb3J0IHR5cGUgUGF0Y2hlc09wdGlvbnMgPVxuICB8IGJvb2xlYW5cbiAgfCB7XG4gICAgICAvKipcbiAgICAgICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYC4gSWYgaXQncyBgdHJ1ZWAsIHRoZSBwYXRoIHdpbGwgYmUgYW4gYXJyYXksIG90aGVyd2lzZSBpdCBpcyBhIHN0cmluZy5cbiAgICAgICAqL1xuICAgICAgcGF0aEFzQXJyYXk/OiBib29sZWFuO1xuICAgICAgLyoqXG4gICAgICAgKiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAuIElmIGl0J3MgYHRydWVgLCB0aGUgYXJyYXkgbGVuZ3RoIHdpbGwgYmUgaW5jbHVkZWQgaW4gdGhlIHBhdGNoZXMsIG90aGVyd2lzZSBubyBpbmNsdWRlIGFycmF5IGxlbmd0aC5cbiAgICAgICAqL1xuICAgICAgYXJyYXlMZW5ndGhBc3NpZ25tZW50PzogYm9vbGVhbjtcbiAgICB9O1xuXG5leHBvcnQgaW50ZXJmYWNlIEZpbmFsaXRpZXMge1xuICBkcmFmdDogKChwYXRjaGVzPzogUGF0Y2hlcywgaW52ZXJzZVBhdGNoZXM/OiBQYXRjaGVzKSA9PiB2b2lkKVtdO1xuICByZXZva2U6ICgoKSA9PiB2b2lkKVtdO1xuICBoYW5kbGVkU2V0OiBXZWFrU2V0PGFueT47XG4gIGRyYWZ0c0NhY2hlOiBXZWFrU2V0PG9iamVjdD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJveHlEcmFmdDxUID0gYW55PiB7XG4gIHR5cGU6IERyYWZ0VHlwZTtcbiAgb3BlcmF0ZWQ/OiBib29sZWFuO1xuICBmaW5hbGl6ZWQ6IGJvb2xlYW47XG4gIG9yaWdpbmFsOiBUO1xuICBjb3B5OiBUIHwgbnVsbDtcbiAgcHJveHk6IFQgfCBudWxsO1xuICBmaW5hbGl0aWVzOiBGaW5hbGl0aWVzO1xuICBvcHRpb25zOiBPcHRpb25zPGFueSwgYW55PiAmIHsgdXBkYXRlZFZhbHVlcz86IFdlYWtNYXA8YW55LCBhbnk+IH07XG4gIHBhcmVudD86IFByb3h5RHJhZnQgfCBudWxsO1xuICBrZXk/OiBzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2w7XG4gIHNldE1hcD86IE1hcDxhbnksIFByb3h5RHJhZnQ+O1xuICBhc3NpZ25lZE1hcD86IE1hcDxhbnksIGJvb2xlYW4+O1xuICBjYWxsYmFja3M/OiAoKHBhdGNoZXM/OiBQYXRjaGVzLCBpbnZlcnNlUGF0Y2hlcz86IFBhdGNoZXMpID0+IHZvaWQpW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSVBhdGNoIHtcbiAgb3A6ICh0eXBlb2YgT3BlcmF0aW9uKVtrZXlvZiB0eXBlb2YgT3BlcmF0aW9uXTtcbiAgdmFsdWU/OiBhbnk7XG59XG5cbmV4cG9ydCB0eXBlIFBhdGNoPFAgZXh0ZW5kcyBQYXRjaGVzT3B0aW9ucyA9IGFueT4gPSBQIGV4dGVuZHMge1xuICBwYXRoQXNBcnJheTogZmFsc2U7XG59XG4gID8gSVBhdGNoICYge1xuICAgICAgcGF0aDogc3RyaW5nO1xuICAgIH1cbiAgOiBQIGV4dGVuZHMgdHJ1ZSB8IG9iamVjdFxuICAgID8gSVBhdGNoICYge1xuICAgICAgICBwYXRoOiAoc3RyaW5nIHwgbnVtYmVyKVtdO1xuICAgICAgfVxuICAgIDogSVBhdGNoICYge1xuICAgICAgICBwYXRoOiBzdHJpbmcgfCAoc3RyaW5nIHwgbnVtYmVyKVtdO1xuICAgICAgfTtcblxuZXhwb3J0IHR5cGUgUGF0Y2hlczxQIGV4dGVuZHMgUGF0Y2hlc09wdGlvbnMgPSBhbnk+ID0gUGF0Y2g8UD5bXTtcblxuZXhwb3J0IHR5cGUgUmVzdWx0PFxuICBUIGV4dGVuZHMgYW55LFxuICBPIGV4dGVuZHMgUGF0Y2hlc09wdGlvbnMsXG4gIEYgZXh0ZW5kcyBib29sZWFuLFxuPiA9IE8gZXh0ZW5kcyB0cnVlIHwgb2JqZWN0XG4gID8gW0YgZXh0ZW5kcyB0cnVlID8gSW1tdXRhYmxlPFQ+IDogVCwgUGF0Y2hlczxPPiwgUGF0Y2hlczxPPl1cbiAgOiBGIGV4dGVuZHMgdHJ1ZVxuICAgID8gSW1tdXRhYmxlPFQ+XG4gICAgOiBUO1xuXG5leHBvcnQgdHlwZSBDcmVhdGVSZXN1bHQ8XG4gIFQgZXh0ZW5kcyBhbnksXG4gIE8gZXh0ZW5kcyBQYXRjaGVzT3B0aW9ucyxcbiAgRiBleHRlbmRzIGJvb2xlYW4sXG4gIFIgZXh0ZW5kcyB2b2lkIHwgUHJvbWlzZTx2b2lkPiB8IFQgfCBQcm9taXNlPFQ+LFxuPiA9IFIgZXh0ZW5kcyBQcm9taXNlPHZvaWQ+IHwgUHJvbWlzZTxUPlxuICA/IFByb21pc2U8UmVzdWx0PFQsIE8sIEY+PlxuICA6IFJlc3VsdDxULCBPLCBGPjtcblxudHlwZSBCYXNlTWFyayA9IG51bGwgfCB1bmRlZmluZWQgfCBEYXRhVHlwZTtcbnR5cGUgTWFya1dpdGhDb3B5ID0gQmFzZU1hcmsgfCAoKCkgPT4gYW55KTtcblxuZXhwb3J0IHR5cGUgTWFyazxPIGV4dGVuZHMgUGF0Y2hlc09wdGlvbnMsIEYgZXh0ZW5kcyBib29sZWFuPiA9IChcbiAgdGFyZ2V0OiBhbnksXG4gIHR5cGVzOiB0eXBlb2YgZGF0YVR5cGVzXG4pID0+IE8gZXh0ZW5kcyB0cnVlIHwgb2JqZWN0XG4gID8gQmFzZU1hcmtcbiAgOiBGIGV4dGVuZHMgdHJ1ZVxuICAgID8gQmFzZU1hcmtcbiAgICA6IE1hcmtXaXRoQ29weTtcblxuZXhwb3J0IGludGVyZmFjZSBBcHBseU11dGFibGVPcHRpb25zIHtcbiAgLyoqXG4gICAqIElmIGl0J3MgYHRydWVgLCB0aGUgc3RhdGUgd2lsbCBiZSBtdXRhdGVkIGRpcmVjdGx5LlxuICAgKi9cbiAgbXV0YWJsZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9uczxPIGV4dGVuZHMgUGF0Y2hlc09wdGlvbnMsIEYgZXh0ZW5kcyBib29sZWFuPiB7XG4gIC8qKlxuICAgKiBJbiBzdHJpY3QgbW9kZSwgRm9yYmlkIGFjY2Vzc2luZyBub24tZHJhZnRhYmxlIHZhbHVlcyBhbmQgZm9yYmlkIHJldHVybmluZyBhIG5vbi1kcmFmdCB2YWx1ZS5cbiAgICovXG4gIHN0cmljdD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBFbmFibGUgcGF0Y2gsIGFuZCByZXR1cm4gdGhlIHBhdGNoZXMgYW5kIGludmVyc2VQYXRjaGVzLlxuICAgKi9cbiAgZW5hYmxlUGF0Y2hlcz86IE87XG4gIC8qKlxuICAgKiBFbmFibGUgYXV0b0ZyZWV6ZSwgYW5kIHJldHVybiBmcm96ZW4gc3RhdGUuXG4gICAqL1xuICBlbmFibGVBdXRvRnJlZXplPzogRjtcbiAgLyoqXG4gICAqIFNldCBhIG1hcmsgdG8gZGV0ZXJtaW5lIGlmIHRoZSBvYmplY3QgaXMgbXV0YWJsZSBvciBpZiBhbiBpbnN0YW5jZSBpcyBhbiBpbW11dGFibGUuXG4gICAqIEFuZCBpdCBjYW4gYWxzbyByZXR1cm4gYSBzaGFsbG93IGNvcHkgZnVuY3Rpb24oQXV0b0ZyZWV6ZSBhbmQgUGF0Y2hlcyBzaG91bGQgYm90aCBiZSBkaXNhYmxlZCkuXG4gICAqL1xuICBtYXJrPzogTWFyazxPLCBGPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFeHRlcm5hbE9wdGlvbnM8TyBleHRlbmRzIFBhdGNoZXNPcHRpb25zLCBGIGV4dGVuZHMgYm9vbGVhbj4ge1xuICAvKipcbiAgICogSW4gc3RyaWN0IG1vZGUsIEZvcmJpZCBhY2Nlc3Npbmcgbm9uLWRyYWZ0YWJsZSB2YWx1ZXMgYW5kIGZvcmJpZCByZXR1cm5pbmcgYSBub24tZHJhZnQgdmFsdWUuXG4gICAqL1xuICBzdHJpY3Q/OiBib29sZWFuO1xuICAvKipcbiAgICogRW5hYmxlIHBhdGNoLCBhbmQgcmV0dXJuIHRoZSBwYXRjaGVzIGFuZCBpbnZlcnNlUGF0Y2hlcy5cbiAgICovXG4gIGVuYWJsZVBhdGNoZXM/OiBPO1xuICAvKipcbiAgICogRW5hYmxlIGF1dG9GcmVlemUsIGFuZCByZXR1cm4gZnJvemVuIHN0YXRlLlxuICAgKi9cbiAgZW5hYmxlQXV0b0ZyZWV6ZT86IEY7XG4gIC8qKlxuICAgKiBTZXQgYSBtYXJrIHRvIGRldGVybWluZSBpZiB0aGUgb2JqZWN0IGlzIG11dGFibGUgb3IgaWYgYW4gaW5zdGFuY2UgaXMgYW4gaW1tdXRhYmxlLlxuICAgKiBBbmQgaXQgY2FuIGFsc28gcmV0dXJuIGEgc2hhbGxvdyBjb3B5IGZ1bmN0aW9uKEF1dG9GcmVlemUgYW5kIFBhdGNoZXMgc2hvdWxkIGJvdGggYmUgZGlzYWJsZWQpLlxuICAgKi9cbiAgbWFyaz86IE1hcms8TywgRj5bXSB8IE1hcms8TywgRj47XG59XG5cbi8vIEV4Y2x1ZGUgYHN5bWJvbGBcbnR5cGUgUHJpbWl0aXZlID0gc3RyaW5nIHwgbnVtYmVyIHwgYmlnaW50IHwgYm9vbGVhbiB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbnR5cGUgSW1tdXRhYmxlTWFwPEssIFY+ID0gUmVhZG9ubHlNYXA8SW1tdXRhYmxlPEs+LCBJbW11dGFibGU8Vj4+O1xudHlwZSBJbW11dGFibGVTZXQ8VD4gPSBSZWFkb25seVNldDxJbW11dGFibGU8VD4+O1xudHlwZSBJbW11dGFibGVPYmplY3Q8VD4gPSB7IHJlYWRvbmx5IFtLIGluIGtleW9mIFRdOiBJbW11dGFibGU8VFtLXT4gfTtcblxuZXhwb3J0IHR5cGUgSWZBdmFpbGFibGU8VCwgRmFsbGJhY2sgPSB2b2lkPiA9IHRydWUgfCBmYWxzZSBleHRlbmRzIChcbiAgVCBleHRlbmRzIG5ldmVyID8gdHJ1ZSA6IGZhbHNlXG4pXG4gID8gRmFsbGJhY2tcbiAgOiBrZXlvZiBUIGV4dGVuZHMgbmV2ZXJcbiAgICA/IEZhbGxiYWNrXG4gICAgOiBUO1xudHlwZSBXZWFrUmVmZXJlbmNlcyA9XG4gIHwgSWZBdmFpbGFibGU8V2Vha01hcDxhbnksIGFueT4+XG4gIHwgSWZBdmFpbGFibGU8V2Vha1NldDxhbnk+PjtcbnR5cGUgQXRvbWljT2JqZWN0ID0gRnVuY3Rpb24gfCBQcm9taXNlPGFueT4gfCBEYXRlIHwgUmVnRXhwO1xuXG5leHBvcnQgdHlwZSBJbW11dGFibGU8VD4gPSBUIGV4dGVuZHMgUHJpbWl0aXZlIHwgQXRvbWljT2JqZWN0XG4gID8gVFxuICA6IFQgZXh0ZW5kcyBJZkF2YWlsYWJsZTxSZWFkb25seU1hcDxpbmZlciBLLCBpbmZlciBWPj5cbiAgICA/IEltbXV0YWJsZU1hcDxLLCBWPlxuICAgIDogVCBleHRlbmRzIElmQXZhaWxhYmxlPFJlYWRvbmx5U2V0PGluZmVyIFY+PlxuICAgICAgPyBJbW11dGFibGVTZXQ8Vj5cbiAgICAgIDogVCBleHRlbmRzIFdlYWtSZWZlcmVuY2VzXG4gICAgICAgID8gVFxuICAgICAgICA6IFQgZXh0ZW5kcyBvYmplY3RcbiAgICAgICAgICA/IEltbXV0YWJsZU9iamVjdDxUPlxuICAgICAgICAgIDogVDtcblxudHlwZSBEcmFmdGVkTWFwPEssIFY+ID0gTWFwPEssIERyYWZ0PFY+PjtcbnR5cGUgRHJhZnRlZFNldDxUPiA9IFNldDxEcmFmdDxUPj47XG5leHBvcnQgdHlwZSBEcmFmdGVkT2JqZWN0PFQ+ID0ge1xuICAtcmVhZG9ubHkgW0sgaW4ga2V5b2YgVF06IERyYWZ0PFRbS10+O1xufTtcblxuZXhwb3J0IHR5cGUgRHJhZnQ8VD4gPSBUIGV4dGVuZHMgUHJpbWl0aXZlIHwgQXRvbWljT2JqZWN0XG4gID8gVFxuICA6IFQgZXh0ZW5kcyBJZkF2YWlsYWJsZTxSZWFkb25seU1hcDxpbmZlciBLLCBpbmZlciBWPj5cbiAgICA/IERyYWZ0ZWRNYXA8SywgVj5cbiAgICA6IFQgZXh0ZW5kcyBJZkF2YWlsYWJsZTxSZWFkb25seVNldDxpbmZlciBWPj5cbiAgICAgID8gRHJhZnRlZFNldDxWPlxuICAgICAgOiBUIGV4dGVuZHMgV2Vha1JlZmVyZW5jZXNcbiAgICAgICAgPyBUXG4gICAgICAgIDogVCBleHRlbmRzIG9iamVjdFxuICAgICAgICAgID8gRHJhZnRlZE9iamVjdDxUPlxuICAgICAgICAgIDogVDtcblxuZXhwb3J0IHR5cGUgQXBwbHlPcHRpb25zPEYgZXh0ZW5kcyBib29sZWFuPiA9XG4gIHwgUGljazxcbiAgICAgIE9wdGlvbnM8Ym9vbGVhbiwgRj4sXG4gICAgICBFeGNsdWRlPGtleW9mIE9wdGlvbnM8Ym9vbGVhbiwgRj4sICdlbmFibGVQYXRjaGVzJz5cbiAgICA+XG4gIHwgQXBwbHlNdXRhYmxlT3B0aW9ucztcblxuZXhwb3J0IHR5cGUgQXBwbHlSZXN1bHQ8XG4gIFQgZXh0ZW5kcyBvYmplY3QsXG4gIEYgZXh0ZW5kcyBib29sZWFuID0gZmFsc2UsXG4gIEEgZXh0ZW5kcyBBcHBseU9wdGlvbnM8Rj4gPSBBcHBseU9wdGlvbnM8Rj4sXG4+ID0gQSBleHRlbmRzIHsgbXV0YWJsZTogdHJ1ZSB9ID8gdm9pZCA6IFQ7XG4iLCAiLy8gRG9uJ3QgdXNlIGBTeW1ib2woKWAganVzdCBmb3IgM3JkIHBhcnR5IGFjY2VzcyB0aGUgZHJhZnRcbmV4cG9ydCBjb25zdCBQUk9YWV9EUkFGVCA9IFN5bWJvbC5mb3IoJ19fTVVUQVRJVkVfUFJPWFlfRFJBRlRfXycpO1xuZXhwb3J0IGNvbnN0IFJBV19SRVRVUk5fU1lNQk9MID0gU3ltYm9sKCdfX01VVEFUSVZFX1JBV19SRVRVUk5fU1lNQk9MX18nKTtcblxuZXhwb3J0IGNvbnN0IGl0ZXJhdG9yU3ltYm9sOiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID0gU3ltYm9sLml0ZXJhdG9yO1xuXG5leHBvcnQgY29uc3QgZGF0YVR5cGVzID0ge1xuICBtdXRhYmxlOiAnbXV0YWJsZScsXG4gIGltbXV0YWJsZTogJ2ltbXV0YWJsZScsXG59IGFzIGNvbnN0O1xuIiwgImltcG9ydCB7IGNyZWF0ZURyYWZ0IH0gZnJvbSAnLi9kcmFmdCc7XG5cbmV4cG9ydCBjb25zdCBpbnRlcm5hbCA9IHt9IGFzIHtcbiAgY3JlYXRlRHJhZnQ6IHR5cGVvZiBjcmVhdGVEcmFmdDtcbn07XG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGhhcyh0YXJnZXQ6IG9iamVjdCwga2V5OiBQcm9wZXJ0eUtleSkge1xuICByZXR1cm4gdGFyZ2V0IGluc3RhbmNlb2YgTWFwXG4gICAgPyB0YXJnZXQuaGFzKGtleSlcbiAgICA6IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0YXJnZXQsIGtleSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZXNjcmlwdG9yKHRhcmdldDogb2JqZWN0LCBrZXk6IFByb3BlcnR5S2V5KSB7XG4gIGlmIChrZXkgaW4gdGFyZ2V0KSB7XG4gICAgbGV0IHByb3RvdHlwZSA9IFJlZmxlY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcbiAgICB3aGlsZSAocHJvdG90eXBlKSB7XG4gICAgICBjb25zdCBkZXNjcmlwdG9yID0gUmVmbGVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocHJvdG90eXBlLCBrZXkpO1xuICAgICAgaWYgKGRlc2NyaXB0b3IpIHJldHVybiBkZXNjcmlwdG9yO1xuICAgICAgcHJvdG90eXBlID0gUmVmbGVjdC5nZXRQcm90b3R5cGVPZihwcm90b3R5cGUpO1xuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Jhc2VTZXRJbnN0YW5jZShvYmo6IGFueSkge1xuICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iaikgPT09IFNldC5wcm90b3R5cGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Jhc2VNYXBJbnN0YW5jZShvYmo6IGFueSkge1xuICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iaikgPT09IE1hcC5wcm90b3R5cGU7XG59XG4iLCAiaW1wb3J0IHsgRHJhZnRUeXBlLCBNYXJrLCBQcm94eURyYWZ0IH0gZnJvbSAnLi4vaW50ZXJmYWNlJztcbmltcG9ydCB7IGRhdGFUeXBlcywgUFJPWFlfRFJBRlQgfSBmcm9tICcuLi9jb25zdGFudCc7XG5pbXBvcnQgeyBoYXMgfSBmcm9tICcuL3Byb3RvJztcblxuZXhwb3J0IGZ1bmN0aW9uIGxhdGVzdDxUID0gYW55Pihwcm94eURyYWZ0OiBQcm94eURyYWZ0KTogVCB7XG4gIHJldHVybiBwcm94eURyYWZ0LmNvcHkgPz8gcHJveHlEcmFmdC5vcmlnaW5hbDtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgdmFsdWUgaXMgYSBkcmFmdFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEcmFmdCh0YXJnZXQ6IGFueSkge1xuICByZXR1cm4gISFnZXRQcm94eURyYWZ0KHRhcmdldCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm94eURyYWZ0PFQgZXh0ZW5kcyBhbnk+KHZhbHVlOiBUKTogUHJveHlEcmFmdCB8IG51bGwge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JykgcmV0dXJuIG51bGw7XG4gIHJldHVybiAodmFsdWUgYXMgeyBbUFJPWFlfRFJBRlRdOiBhbnkgfSk/LltQUk9YWV9EUkFGVF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRWYWx1ZTxUIGV4dGVuZHMgb2JqZWN0Pih2YWx1ZTogVCk6IFQge1xuICBjb25zdCBwcm94eURyYWZ0ID0gZ2V0UHJveHlEcmFmdCh2YWx1ZSk7XG4gIHJldHVybiBwcm94eURyYWZ0ID8gKHByb3h5RHJhZnQuY29weSA/PyBwcm94eURyYWZ0Lm9yaWdpbmFsKSA6IHZhbHVlO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGEgdmFsdWUgaXMgZHJhZnRhYmxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RyYWZ0YWJsZSh2YWx1ZTogYW55LCBvcHRpb25zPzogeyBtYXJrPzogTWFyazxhbnksIGFueT4gfSkge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcbiAgbGV0IG1hcmtSZXN1bHQ6IGFueTtcbiAgcmV0dXJuIChcbiAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpID09PSBPYmplY3QucHJvdG90eXBlIHx8XG4gICAgQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHxcbiAgICB2YWx1ZSBpbnN0YW5jZW9mIE1hcCB8fFxuICAgIHZhbHVlIGluc3RhbmNlb2YgU2V0IHx8XG4gICAgKCEhb3B0aW9ucz8ubWFyayAmJlxuICAgICAgKChtYXJrUmVzdWx0ID0gb3B0aW9ucy5tYXJrKHZhbHVlLCBkYXRhVHlwZXMpKSA9PT0gZGF0YVR5cGVzLmltbXV0YWJsZSB8fFxuICAgICAgICB0eXBlb2YgbWFya1Jlc3VsdCA9PT0gJ2Z1bmN0aW9uJykpXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXRoKFxuICB0YXJnZXQ6IFByb3h5RHJhZnQsXG4gIHBhdGg6IGFueVtdID0gW11cbik6IChzdHJpbmcgfCBudW1iZXIgfCBvYmplY3QpW10gfCBudWxsIHtcbiAgaWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRhcmdldCwgJ2tleScpKSB7XG4gICAgLy8gY2hlY2sgaWYgdGhlIHBhcmVudCBpcyBhIGRyYWZ0IGFuZCB0aGUgb3JpZ2luYWwgdmFsdWUgaXMgbm90IGVxdWFsIHRvIHRoZSBjdXJyZW50IHZhbHVlXG4gICAgY29uc3QgcGFyZW50Q29weSA9IHRhcmdldC5wYXJlbnQhLmNvcHk7XG4gICAgY29uc3QgcHJveHlEcmFmdCA9IGdldFByb3h5RHJhZnQoZ2V0KHBhcmVudENvcHksIHRhcmdldC5rZXkhKSk7XG4gICAgaWYgKHByb3h5RHJhZnQgIT09IG51bGwgJiYgcHJveHlEcmFmdD8ub3JpZ2luYWwgIT09IHRhcmdldC5vcmlnaW5hbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGlzU2V0ID0gdGFyZ2V0LnBhcmVudCEudHlwZSA9PT0gRHJhZnRUeXBlLlNldDtcbiAgICBjb25zdCBrZXkgPSBpc1NldFxuICAgICAgPyBBcnJheS5mcm9tKHRhcmdldC5wYXJlbnQhLnNldE1hcCEua2V5cygpKS5pbmRleE9mKHRhcmdldC5rZXkpXG4gICAgICA6IHRhcmdldC5rZXk7XG4gICAgLy8gY2hlY2sgaWYgdGhlIGtleSBpcyBzdGlsbCBpbiB0aGUgbmV4dCBzdGF0ZSBwYXJlbnRcbiAgICBpZiAoXG4gICAgICAhKChpc1NldCAmJiBwYXJlbnRDb3B5LnNpemUgPiAoa2V5IGFzIG51bWJlcikpIHx8IGhhcyhwYXJlbnRDb3B5LCBrZXkhKSlcbiAgICApXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICBwYXRoLnB1c2goa2V5KTtcbiAgfVxuICBpZiAodGFyZ2V0LnBhcmVudCkge1xuICAgIHJldHVybiBnZXRQYXRoKHRhcmdldC5wYXJlbnQsIHBhdGgpO1xuICB9XG4gIC8vIGB0YXJnZXRgIGlzIHJvb3QgZHJhZnQuXG4gIHBhdGgucmV2ZXJzZSgpO1xuICB0cnkge1xuICAgIC8vIGNoZWNrIGlmIHRoZSBwYXRoIGlzIHZhbGlkXG4gICAgcmVzb2x2ZVBhdGgodGFyZ2V0LmNvcHksIHBhdGgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlKHRhcmdldDogYW55KSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHJldHVybiBEcmFmdFR5cGUuQXJyYXk7XG4gIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBNYXApIHJldHVybiBEcmFmdFR5cGUuTWFwO1xuICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgU2V0KSByZXR1cm4gRHJhZnRUeXBlLlNldDtcbiAgcmV0dXJuIERyYWZ0VHlwZS5PYmplY3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXQodGFyZ2V0OiBhbnksIGtleTogUHJvcGVydHlLZXkpIHtcbiAgcmV0dXJuIGdldFR5cGUodGFyZ2V0KSA9PT0gRHJhZnRUeXBlLk1hcCA/IHRhcmdldC5nZXQoa2V5KSA6IHRhcmdldFtrZXldO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0KHRhcmdldDogYW55LCBrZXk6IFByb3BlcnR5S2V5LCB2YWx1ZTogYW55KSB7XG4gIGNvbnN0IHR5cGUgPSBnZXRUeXBlKHRhcmdldCk7XG4gIGlmICh0eXBlID09PSBEcmFmdFR5cGUuTWFwKSB7XG4gICAgdGFyZ2V0LnNldChrZXksIHZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICB0YXJnZXRba2V5XSA9IHZhbHVlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwZWVrKHRhcmdldDogYW55LCBrZXk6IFByb3BlcnR5S2V5KSB7XG4gIGNvbnN0IHN0YXRlID0gZ2V0UHJveHlEcmFmdCh0YXJnZXQpO1xuICBjb25zdCBzb3VyY2UgPSBzdGF0ZSA/IGxhdGVzdChzdGF0ZSkgOiB0YXJnZXQ7XG4gIHJldHVybiBzb3VyY2Vba2V5XTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRXF1YWwoeDogYW55LCB5OiBhbnkpIHtcbiAgaWYgKHggPT09IHkpIHtcbiAgICByZXR1cm4geCAhPT0gMCB8fCAxIC8geCA9PT0gMSAvIHk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHggIT09IHggJiYgeSAhPT0geTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmV2b2tlUHJveHkocHJveHlEcmFmdDogUHJveHlEcmFmdCB8IG51bGwpIHtcbiAgaWYgKCFwcm94eURyYWZ0KSByZXR1cm47XG4gIHdoaWxlIChwcm94eURyYWZ0LmZpbmFsaXRpZXMucmV2b2tlLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCByZXZva2UgPSBwcm94eURyYWZ0LmZpbmFsaXRpZXMucmV2b2tlLnBvcCgpITtcbiAgICByZXZva2UoKTtcbiAgfVxufVxuXG4vLyBoYW5kbGUgSlNPTiBQb2ludGVyIHBhdGggd2l0aCBzcGVjIGh0dHBzOi8vd3d3LnJmYy1lZGl0b3Iub3JnL3JmYy9yZmM2OTAxXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlUGF0aChwYXRoOiBzdHJpbmdbXSwgcGF0aEFzQXJyYXk6IGJvb2xlYW4pIHtcbiAgcmV0dXJuIHBhdGhBc0FycmF5XG4gICAgPyBwYXRoXG4gICAgOiBbJyddXG4gICAgICAgIC5jb25jYXQocGF0aClcbiAgICAgICAgLm1hcCgoX2l0ZW0pID0+IHtcbiAgICAgICAgICBjb25zdCBpdGVtID0gYCR7X2l0ZW19YDtcbiAgICAgICAgICBpZiAoaXRlbS5pbmRleE9mKCcvJykgPT09IC0xICYmIGl0ZW0uaW5kZXhPZignficpID09PSAtMSkgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgcmV0dXJuIGl0ZW0ucmVwbGFjZSgvfi9nLCAnfjAnKS5yZXBsYWNlKC9cXC8vZywgJ34xJyk7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKCcvJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1bmVzY2FwZVBhdGgocGF0aDogc3RyaW5nIHwgKHN0cmluZyB8IG51bWJlcilbXSkge1xuICBpZiAoQXJyYXkuaXNBcnJheShwYXRoKSkgcmV0dXJuIHBhdGg7XG4gIHJldHVybiBwYXRoXG4gICAgLnNwbGl0KCcvJylcbiAgICAubWFwKChfaXRlbSkgPT4gX2l0ZW0ucmVwbGFjZSgvfjEvZywgJy8nKS5yZXBsYWNlKC9+MC9nLCAnficpKVxuICAgIC5zbGljZSgxKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVQYXRoKGJhc2U6IGFueSwgcGF0aDogKHN0cmluZyB8IG51bWJlcilbXSkge1xuICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcGF0aC5sZW5ndGggLSAxOyBpbmRleCArPSAxKSB7XG4gICAgY29uc3Qga2V5ID0gcGF0aFtpbmRleF07XG4gICAgLy8gdXNlIGBpbmRleGAgaW4gU2V0IGRyYWZ0XG4gICAgYmFzZSA9IGdldChnZXRUeXBlKGJhc2UpID09PSBEcmFmdFR5cGUuU2V0ID8gQXJyYXkuZnJvbShiYXNlKSA6IGJhc2UsIGtleSk7XG4gICAgaWYgKHR5cGVvZiBiYXNlICE9PSAnb2JqZWN0Jykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgcmVzb2x2ZSBwYXRjaCBhdCAnJHtwYXRoLmpvaW4oJy8nKX0nLmApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYmFzZTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IE9wdGlvbnMsIFByb3h5RHJhZnQgfSBmcm9tICcuLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgZGF0YVR5cGVzIH0gZnJvbSAnLi4vY29uc3RhbnQnO1xuaW1wb3J0IHsgZ2V0VmFsdWUsIGlzRHJhZnQsIGlzRHJhZnRhYmxlIH0gZnJvbSAnLi9kcmFmdCc7XG5pbXBvcnQgeyBpc0Jhc2VNYXBJbnN0YW5jZSwgaXNCYXNlU2V0SW5zdGFuY2UgfSBmcm9tICcuL3Byb3RvJztcblxuZnVuY3Rpb24gc3RyaWN0Q29weSh0YXJnZXQ6IGFueSkge1xuICBjb25zdCBjb3B5ID0gT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KSk7XG4gIFJlZmxlY3Qub3duS2V5cyh0YXJnZXQpLmZvckVhY2goKGtleTogYW55KSA9PiB7XG4gICAgbGV0IGRlc2MgPSBSZWZsZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkhO1xuICAgIGlmIChkZXNjLmVudW1lcmFibGUgJiYgZGVzYy5jb25maWd1cmFibGUgJiYgZGVzYy53cml0YWJsZSkge1xuICAgICAgY29weVtrZXldID0gdGFyZ2V0W2tleV07XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIGZvciBmcmVlemVcbiAgICBpZiAoIWRlc2Mud3JpdGFibGUpIHtcbiAgICAgIGRlc2Mud3JpdGFibGUgPSB0cnVlO1xuICAgICAgZGVzYy5jb25maWd1cmFibGUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoZGVzYy5nZXQgfHwgZGVzYy5zZXQpXG4gICAgICBkZXNjID0ge1xuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBkZXNjLmVudW1lcmFibGUsXG4gICAgICAgIHZhbHVlOiB0YXJnZXRba2V5XSxcbiAgICAgIH07XG4gICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShjb3B5LCBrZXksIGRlc2MpO1xuICB9KTtcbiAgcmV0dXJuIGNvcHk7XG59XG5cbmNvbnN0IHByb3BJc0VudW0gPSBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG5leHBvcnQgZnVuY3Rpb24gc2hhbGxvd0NvcHkob3JpZ2luYWw6IGFueSwgb3B0aW9ucz86IE9wdGlvbnM8YW55LCBhbnk+KSB7XG4gIGxldCBtYXJrUmVzdWx0OiBhbnk7XG4gIGlmIChBcnJheS5pc0FycmF5KG9yaWdpbmFsKSkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuY29uY2F0LmNhbGwob3JpZ2luYWwpO1xuICB9IGVsc2UgaWYgKG9yaWdpbmFsIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgaWYgKCFpc0Jhc2VTZXRJbnN0YW5jZShvcmlnaW5hbCkpIHtcbiAgICAgIGNvbnN0IFN1YkNsYXNzID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9yaWdpbmFsKS5jb25zdHJ1Y3RvcjtcbiAgICAgIHJldHVybiBuZXcgU3ViQ2xhc3Mob3JpZ2luYWwudmFsdWVzKCkpO1xuICAgIH1cbiAgICByZXR1cm4gU2V0LnByb3RvdHlwZS5kaWZmZXJlbmNlXG4gICAgICA/IFNldC5wcm90b3R5cGUuZGlmZmVyZW5jZS5jYWxsKG9yaWdpbmFsLCBuZXcgU2V0KCkpXG4gICAgICA6IG5ldyBTZXQob3JpZ2luYWwudmFsdWVzKCkpO1xuICB9IGVsc2UgaWYgKG9yaWdpbmFsIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgaWYgKCFpc0Jhc2VNYXBJbnN0YW5jZShvcmlnaW5hbCkpIHtcbiAgICAgIGNvbnN0IFN1YkNsYXNzID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9yaWdpbmFsKS5jb25zdHJ1Y3RvcjtcbiAgICAgIHJldHVybiBuZXcgU3ViQ2xhc3Mob3JpZ2luYWwpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IE1hcChvcmlnaW5hbCk7XG4gIH0gZWxzZSBpZiAoXG4gICAgb3B0aW9ucz8ubWFyayAmJlxuICAgICgobWFya1Jlc3VsdCA9IG9wdGlvbnMubWFyayhvcmlnaW5hbCwgZGF0YVR5cGVzKSksXG4gICAgbWFya1Jlc3VsdCAhPT0gdW5kZWZpbmVkKSAmJlxuICAgIG1hcmtSZXN1bHQgIT09IGRhdGFUeXBlcy5tdXRhYmxlXG4gICkge1xuICAgIGlmIChtYXJrUmVzdWx0ID09PSBkYXRhVHlwZXMuaW1tdXRhYmxlKSB7XG4gICAgICByZXR1cm4gc3RyaWN0Q29weShvcmlnaW5hbCk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWFya1Jlc3VsdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKF9fREVWX18gJiYgKG9wdGlvbnMuZW5hYmxlUGF0Y2hlcyB8fCBvcHRpb25zLmVuYWJsZUF1dG9GcmVlemUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgWW91IGNhbid0IHVzZSBtYXJrIGFuZCBwYXRjaGVzIG9yIGF1dG8gZnJlZXplIHRvZ2V0aGVyLmBcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtYXJrUmVzdWx0KCk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgbWFyayByZXN1bHQ6ICR7bWFya1Jlc3VsdH1gKTtcbiAgfSBlbHNlIGlmIChcbiAgICB0eXBlb2Ygb3JpZ2luYWwgPT09ICdvYmplY3QnICYmXG4gICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKG9yaWdpbmFsKSA9PT0gT2JqZWN0LnByb3RvdHlwZVxuICApIHtcbiAgICAvLyBGb3IgYmVzdCBwZXJmb3JtYW5jZSB3aXRoIHNoYWxsb3cgY29waWVzLFxuICAgIC8vIGRvbid0IHVzZSBgT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKSwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob2JqKSk7YCBieSBkZWZhdWx0LlxuICAgIGNvbnN0IGNvcHk6IFJlY29yZDxzdHJpbmcgfCBzeW1ib2wsIGFueT4gPSB7fTtcbiAgICBPYmplY3Qua2V5cyhvcmlnaW5hbCkuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICBjb3B5W2tleV0gPSBvcmlnaW5hbFtrZXldO1xuICAgIH0pO1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMob3JpZ2luYWwpLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgaWYgKHByb3BJc0VudW0uY2FsbChvcmlnaW5hbCwga2V5KSkge1xuICAgICAgICBjb3B5W2tleV0gPSBvcmlnaW5hbFtrZXldO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBjb3B5O1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBQbGVhc2UgY2hlY2sgbWFyaygpIHRvIGVuc3VyZSB0aGF0IGl0IGlzIGEgc3RhYmxlIG1hcmtlciBkcmFmdGFibGUgZnVuY3Rpb24uYFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVNoYWxsb3dDb3B5KHRhcmdldDogUHJveHlEcmFmdCkge1xuICBpZiAodGFyZ2V0LmNvcHkpIHJldHVybjtcbiAgdGFyZ2V0LmNvcHkgPSBzaGFsbG93Q29weSh0YXJnZXQub3JpZ2luYWwsIHRhcmdldC5vcHRpb25zKSE7XG59XG5cbmZ1bmN0aW9uIGRlZXBDbG9uZTxUPih0YXJnZXQ6IFQpOiBUO1xuZnVuY3Rpb24gZGVlcENsb25lKHRhcmdldDogYW55KSB7XG4gIGlmICghaXNEcmFmdGFibGUodGFyZ2V0KSkgcmV0dXJuIGdldFZhbHVlKHRhcmdldCk7XG4gIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHJldHVybiB0YXJnZXQubWFwKGRlZXBDbG9uZSk7XG4gIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBNYXApIHtcbiAgICBjb25zdCBpdGVyYWJsZSA9IEFycmF5LmZyb20odGFyZ2V0LmVudHJpZXMoKSkubWFwKChbaywgdl0pID0+IFtcbiAgICAgIGssXG4gICAgICBkZWVwQ2xvbmUodiksXG4gICAgXSkgYXMgSXRlcmFibGU8cmVhZG9ubHkgW2FueSwgYW55XT47XG4gICAgaWYgKCFpc0Jhc2VNYXBJbnN0YW5jZSh0YXJnZXQpKSB7XG4gICAgICBjb25zdCBTdWJDbGFzcyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpLmNvbnN0cnVjdG9yO1xuICAgICAgcmV0dXJuIG5ldyBTdWJDbGFzcyhpdGVyYWJsZSk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgTWFwKGl0ZXJhYmxlKTtcbiAgfVxuICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgU2V0KSB7XG4gICAgY29uc3QgaXRlcmFibGUgPSBBcnJheS5mcm9tKHRhcmdldCkubWFwKGRlZXBDbG9uZSk7XG4gICAgaWYgKCFpc0Jhc2VTZXRJbnN0YW5jZSh0YXJnZXQpKSB7XG4gICAgICBjb25zdCBTdWJDbGFzcyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpLmNvbnN0cnVjdG9yO1xuICAgICAgcmV0dXJuIG5ldyBTdWJDbGFzcyhpdGVyYWJsZSk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgU2V0KGl0ZXJhYmxlKTtcbiAgfVxuICBjb25zdCBjb3B5ID0gT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KSk7XG4gIGZvciAoY29uc3Qga2V5IGluIHRhcmdldCkgY29weVtrZXldID0gZGVlcENsb25lKHRhcmdldFtrZXldKTtcbiAgcmV0dXJuIGNvcHk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbG9uZUlmTmVlZGVkPFQ+KHRhcmdldDogVCk6IFQge1xuICByZXR1cm4gaXNEcmFmdCh0YXJnZXQpID8gZGVlcENsb25lKHRhcmdldCkgOiB0YXJnZXQ7XG59XG5cbmV4cG9ydCB7IGRlZXBDbG9uZSB9O1xuIiwgImltcG9ydCB7IFByb3h5RHJhZnQgfSBmcm9tICcuLi9pbnRlcmZhY2UnO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFya0NoYW5nZWQocHJveHlEcmFmdDogUHJveHlEcmFmdCkge1xuICBwcm94eURyYWZ0LmFzc2lnbmVkTWFwID0gcHJveHlEcmFmdC5hc3NpZ25lZE1hcCA/PyBuZXcgTWFwKCk7XG4gIGlmICghcHJveHlEcmFmdC5vcGVyYXRlZCkge1xuICAgIHByb3h5RHJhZnQub3BlcmF0ZWQgPSB0cnVlO1xuICAgIGlmIChwcm94eURyYWZ0LnBhcmVudCkge1xuICAgICAgbWFya0NoYW5nZWQocHJveHlEcmFmdC5wYXJlbnQpO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7IERyYWZ0VHlwZSB9IGZyb20gJy4uL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBnZXRUeXBlLCBpc0RyYWZ0IH0gZnJvbSAnLi9kcmFmdCc7XG5cbmZ1bmN0aW9uIHRocm93RnJvemVuRXJyb3IoKSB7XG4gIHRocm93IG5ldyBFcnJvcignQ2Fubm90IG1vZGlmeSBmcm96ZW4gb2JqZWN0Jyk7XG59XG5cbmZ1bmN0aW9uIGlzRnJlZXphYmxlKHZhbHVlOiBhbnkpIHtcbiAgcmV0dXJuIChcbiAgICBfX0RFVl9fIHx8ICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmICFPYmplY3QuaXNGcm96ZW4odmFsdWUpKVxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVlcEZyZWV6ZShcbiAgdGFyZ2V0OiBhbnksXG4gIHN1YktleT86IGFueSxcbiAgdXBkYXRlZFZhbHVlcz86IFdlYWtNYXA8YW55LCBhbnk+LFxuICBzdGFjaz86IGFueVtdLFxuICBrZXlzPzogYW55W11cbikge1xuICBpZiAoX19ERVZfXykge1xuICAgIHVwZGF0ZWRWYWx1ZXMgPSB1cGRhdGVkVmFsdWVzID8/IG5ldyBXZWFrTWFwKCk7XG4gICAgc3RhY2sgPSBzdGFjayA/PyBbXTtcbiAgICBrZXlzID0ga2V5cyA/PyBbXTtcbiAgICBjb25zdCB2YWx1ZSA9IHVwZGF0ZWRWYWx1ZXMuaGFzKHRhcmdldClcbiAgICAgID8gdXBkYXRlZFZhbHVlcy5nZXQodGFyZ2V0KVxuICAgICAgOiB0YXJnZXQ7XG4gICAgaWYgKHN0YWNrLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGluZGV4ID0gc3RhY2suaW5kZXhPZih2YWx1ZSk7XG4gICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiBpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgaWYgKHN0YWNrWzBdID09PSB2YWx1ZSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRm9yYmlkcyBjaXJjdWxhciByZWZlcmVuY2VgKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEZvcmJpZHMgY2lyY3VsYXIgcmVmZXJlbmNlOiB+LyR7a2V5c1xuICAgICAgICAgICAgLnNsaWNlKDAsIGluZGV4KVxuICAgICAgICAgICAgLm1hcCgoa2V5LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gJ3N5bWJvbCcpIHJldHVybiBgWyR7a2V5LnRvU3RyaW5nKCl9XWA7XG4gICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHN0YWNrIVtpbmRleF07XG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICB0eXBlb2Yga2V5ID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICAgIChwYXJlbnQgaW5zdGFuY2VvZiBNYXAgfHwgcGFyZW50IGluc3RhbmNlb2YgU2V0KVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgcmV0dXJuIEFycmF5LmZyb20ocGFyZW50LmtleXMoKSkuaW5kZXhPZihrZXkpO1xuICAgICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5qb2luKCcvJyl9YFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XG4gICAgICBrZXlzLnB1c2goc3ViS2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGlmIChPYmplY3QuaXNGcm96ZW4odGFyZ2V0KSB8fCBpc0RyYWZ0KHRhcmdldCkpIHtcbiAgICBpZiAoX19ERVZfXykge1xuICAgICAgc3RhY2shLnBvcCgpO1xuICAgICAga2V5cyEucG9wKCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB0eXBlID0gZ2V0VHlwZSh0YXJnZXQpO1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlIERyYWZ0VHlwZS5NYXA6XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiB0YXJnZXQpIHtcbiAgICAgICAgaWYgKGlzRnJlZXphYmxlKGtleSkpIGRlZXBGcmVlemUoa2V5LCBrZXksIHVwZGF0ZWRWYWx1ZXMsIHN0YWNrLCBrZXlzKTtcbiAgICAgICAgaWYgKGlzRnJlZXphYmxlKHZhbHVlKSlcbiAgICAgICAgICBkZWVwRnJlZXplKHZhbHVlLCBrZXksIHVwZGF0ZWRWYWx1ZXMsIHN0YWNrLCBrZXlzKTtcbiAgICAgIH1cbiAgICAgIHRhcmdldC5zZXQgPSB0YXJnZXQuY2xlYXIgPSB0YXJnZXQuZGVsZXRlID0gdGhyb3dGcm96ZW5FcnJvcjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgRHJhZnRUeXBlLlNldDpcbiAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdGFyZ2V0KSB7XG4gICAgICAgIGlmIChpc0ZyZWV6YWJsZSh2YWx1ZSkpXG4gICAgICAgICAgZGVlcEZyZWV6ZSh2YWx1ZSwgdmFsdWUsIHVwZGF0ZWRWYWx1ZXMsIHN0YWNrLCBrZXlzKTtcbiAgICAgIH1cbiAgICAgIHRhcmdldC5hZGQgPSB0YXJnZXQuY2xlYXIgPSB0YXJnZXQuZGVsZXRlID0gdGhyb3dGcm96ZW5FcnJvcjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgRHJhZnRUeXBlLkFycmF5OlxuICAgICAgT2JqZWN0LmZyZWV6ZSh0YXJnZXQpO1xuICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdGFyZ2V0KSB7XG4gICAgICAgIGlmIChpc0ZyZWV6YWJsZSh2YWx1ZSkpXG4gICAgICAgICAgZGVlcEZyZWV6ZSh2YWx1ZSwgaW5kZXgsIHVwZGF0ZWRWYWx1ZXMsIHN0YWNrLCBrZXlzKTtcbiAgICAgICAgaW5kZXggKz0gMTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBPYmplY3QuZnJlZXplKHRhcmdldCk7XG4gICAgICAvLyBpZ25vcmUgbm9uLWVudW1lcmFibGUgb3Igc3ltYm9sIHByb3BlcnRpZXNcbiAgICAgIE9iamVjdC5rZXlzKHRhcmdldCkuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRhcmdldFtuYW1lXTtcbiAgICAgICAgaWYgKGlzRnJlZXphYmxlKHZhbHVlKSlcbiAgICAgICAgICBkZWVwRnJlZXplKHZhbHVlLCBuYW1lLCB1cGRhdGVkVmFsdWVzLCBzdGFjaywga2V5cyk7XG4gICAgICB9KTtcbiAgfVxuICBpZiAoX19ERVZfXykge1xuICAgIHN0YWNrIS5wb3AoKTtcbiAgICBrZXlzIS5wb3AoKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IERyYWZ0VHlwZSB9IGZyb20gJy4uL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBnZXRUeXBlIH0gZnJvbSAnLi9kcmFmdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JFYWNoPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICB0YXJnZXQ6IFQsXG4gIGl0ZXI6IChrZXk6IHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCwgdmFsdWU6IGFueSwgc291cmNlOiBUKSA9PiB2b2lkXG4pIHtcbiAgY29uc3QgdHlwZSA9IGdldFR5cGUodGFyZ2V0KTtcbiAgaWYgKHR5cGUgPT09IERyYWZ0VHlwZS5PYmplY3QpIHtcbiAgICBSZWZsZWN0Lm93bktleXModGFyZ2V0KS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIGl0ZXIoa2V5LCAodGFyZ2V0IGFzIGFueSlba2V5XSwgdGFyZ2V0KTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlID09PSBEcmFmdFR5cGUuQXJyYXkpIHtcbiAgICBsZXQgaW5kZXggPSAwO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgdGFyZ2V0IGFzIGFueVtdKSB7XG4gICAgICBpdGVyKGluZGV4LCBlbnRyeSwgdGFyZ2V0KTtcbiAgICAgIGluZGV4ICs9IDE7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgICh0YXJnZXQgYXMgTWFwPGFueSwgYW55PiB8IFNldDxhbnk+KS5mb3JFYWNoKChlbnRyeTogYW55LCBpbmRleDogYW55KSA9PlxuICAgICAgaXRlcihpbmRleCwgZW50cnksIHRhcmdldClcbiAgICApO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgRHJhZnRUeXBlLCBQYXRjaGVzLCBQcm94eURyYWZ0IH0gZnJvbSAnLi4vaW50ZXJmYWNlJztcbmltcG9ydCB7IGVuc3VyZVNoYWxsb3dDb3B5IH0gZnJvbSAnLi9jb3B5JztcbmltcG9ydCB7XG4gIGdldCxcbiAgZ2V0UGF0aCxcbiAgZ2V0UHJveHlEcmFmdCxcbiAgZ2V0VmFsdWUsXG4gIGlzRHJhZnQsXG4gIGlzRHJhZnRhYmxlLFxuICBpc0VxdWFsLFxuICBzZXQsXG59IGZyb20gJy4vZHJhZnQnO1xuaW1wb3J0IHsgZm9yRWFjaCB9IGZyb20gJy4vZm9yRWFjaCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBoYW5kbGVWYWx1ZShcbiAgdGFyZ2V0OiBhbnksXG4gIGhhbmRsZWRTZXQ6IFdlYWtTZXQ8YW55PixcbiAgb3B0aW9ucz86IFByb3h5RHJhZnRbJ29wdGlvbnMnXVxuKSB7XG4gIGlmIChcbiAgICBpc0RyYWZ0KHRhcmdldCkgfHxcbiAgICAhaXNEcmFmdGFibGUodGFyZ2V0LCBvcHRpb25zKSB8fFxuICAgIGhhbmRsZWRTZXQuaGFzKHRhcmdldCkgfHxcbiAgICBPYmplY3QuaXNGcm96ZW4odGFyZ2V0KVxuICApXG4gICAgcmV0dXJuO1xuICBjb25zdCBpc1NldCA9IHRhcmdldCBpbnN0YW5jZW9mIFNldDtcbiAgY29uc3Qgc2V0TWFwOiBNYXA8YW55LCBhbnk+IHwgdW5kZWZpbmVkID0gaXNTZXQgPyBuZXcgTWFwKCkgOiB1bmRlZmluZWQ7XG4gIGhhbmRsZWRTZXQuYWRkKHRhcmdldCk7XG4gIGZvckVhY2godGFyZ2V0LCAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgIGlmIChpc0RyYWZ0KHZhbHVlKSkge1xuICAgICAgY29uc3QgcHJveHlEcmFmdCA9IGdldFByb3h5RHJhZnQodmFsdWUpITtcbiAgICAgIGVuc3VyZVNoYWxsb3dDb3B5KHByb3h5RHJhZnQpO1xuICAgICAgLy8gQSBkcmFmdCB3aGVyZSBhIGNoaWxkIG5vZGUgaGFzIGJlZW4gY2hhbmdlZCwgb3IgYXNzaWduZWQgYSB2YWx1ZVxuICAgICAgY29uc3QgdXBkYXRlZFZhbHVlID1cbiAgICAgICAgcHJveHlEcmFmdC5hc3NpZ25lZE1hcD8uc2l6ZSB8fCBwcm94eURyYWZ0Lm9wZXJhdGVkXG4gICAgICAgICAgPyBwcm94eURyYWZ0LmNvcHlcbiAgICAgICAgICA6IHByb3h5RHJhZnQub3JpZ2luYWw7XG4gICAgICAvLyBmaW5hbCB1cGRhdGUgdmFsdWVcbiAgICAgIHNldChpc1NldCA/IHNldE1hcCEgOiB0YXJnZXQsIGtleSwgdXBkYXRlZFZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGFuZGxlVmFsdWUodmFsdWUsIGhhbmRsZWRTZXQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfSk7XG4gIGlmIChzZXRNYXApIHtcbiAgICBjb25zdCBzZXQgPSB0YXJnZXQgYXMgU2V0PGFueT47XG4gICAgY29uc3QgdmFsdWVzID0gQXJyYXkuZnJvbShzZXQpO1xuICAgIHNldC5jbGVhcigpO1xuICAgIHZhbHVlcy5mb3JFYWNoKCh2YWx1ZSkgPT4ge1xuICAgICAgc2V0LmFkZChzZXRNYXAhLmhhcyh2YWx1ZSkgPyBzZXRNYXAhLmdldCh2YWx1ZSkgOiB2YWx1ZSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmFsaXplQXNzaWduZWQocHJveHlEcmFmdDogUHJveHlEcmFmdCwga2V5OiBQcm9wZXJ0eUtleSkge1xuICAvLyBoYW5kbGUgdGhlIGRyYWZ0YWJsZSBhc3NpZ25lZCB2YWx1ZXNcdUZGMEMgYW5kIHRoZSB2YWx1ZSBpcyBub3QgYSBkcmFmdFxuICBjb25zdCBjb3B5ID1cbiAgICBwcm94eURyYWZ0LnR5cGUgPT09IERyYWZ0VHlwZS5TZXQgPyBwcm94eURyYWZ0LnNldE1hcCA6IHByb3h5RHJhZnQuY29weTtcbiAgaWYgKFxuICAgIHByb3h5RHJhZnQuZmluYWxpdGllcy5yZXZva2UubGVuZ3RoID4gMSAmJlxuICAgIHByb3h5RHJhZnQuYXNzaWduZWRNYXAhLmdldChrZXkpICYmXG4gICAgY29weVxuICApIHtcbiAgICBoYW5kbGVWYWx1ZShcbiAgICAgIGdldChjb3B5LCBrZXkpLFxuICAgICAgcHJveHlEcmFmdC5maW5hbGl0aWVzLmhhbmRsZWRTZXQsXG4gICAgICBwcm94eURyYWZ0Lm9wdGlvbnNcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIEdlbmVyYXRlUGF0Y2hlcyA9IChcbiAgcHJveHlTdGF0ZTogUHJveHlEcmFmdCxcbiAgYmFzZVBhdGg6IGFueVtdLFxuICBwYXRjaGVzOiBQYXRjaGVzLFxuICBpbnZlcnNlUGF0Y2hlczogUGF0Y2hlc1xuKSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gZmluYWxpemVTZXRWYWx1ZSh0YXJnZXQ6IFByb3h5RHJhZnQpIHtcbiAgaWYgKHRhcmdldC50eXBlID09PSBEcmFmdFR5cGUuU2V0ICYmIHRhcmdldC5jb3B5KSB7XG4gICAgdGFyZ2V0LmNvcHkuY2xlYXIoKTtcbiAgICB0YXJnZXQuc2V0TWFwIS5mb3JFYWNoKCh2YWx1ZSkgPT4ge1xuICAgICAgdGFyZ2V0LmNvcHkhLmFkZChnZXRWYWx1ZSh2YWx1ZSkpO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5hbGl6ZVBhdGNoZXMoXG4gIHRhcmdldDogUHJveHlEcmFmdCxcbiAgZ2VuZXJhdGVQYXRjaGVzOiBHZW5lcmF0ZVBhdGNoZXMsXG4gIHBhdGNoZXM/OiBQYXRjaGVzLFxuICBpbnZlcnNlUGF0Y2hlcz86IFBhdGNoZXNcbikge1xuICBjb25zdCBzaG91bGRGaW5hbGl6ZSA9XG4gICAgdGFyZ2V0Lm9wZXJhdGVkICYmXG4gICAgdGFyZ2V0LmFzc2lnbmVkTWFwICYmXG4gICAgdGFyZ2V0LmFzc2lnbmVkTWFwLnNpemUgPiAwICYmXG4gICAgIXRhcmdldC5maW5hbGl6ZWQ7XG4gIGlmIChzaG91bGRGaW5hbGl6ZSkge1xuICAgIGlmIChwYXRjaGVzICYmIGludmVyc2VQYXRjaGVzKSB7XG4gICAgICBjb25zdCBiYXNlUGF0aCA9IGdldFBhdGgodGFyZ2V0KTtcbiAgICAgIGlmIChiYXNlUGF0aCkge1xuICAgICAgICBnZW5lcmF0ZVBhdGNoZXModGFyZ2V0LCBiYXNlUGF0aCwgcGF0Y2hlcywgaW52ZXJzZVBhdGNoZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICB0YXJnZXQuZmluYWxpemVkID0gdHJ1ZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFya0ZpbmFsaXphdGlvbihcbiAgdGFyZ2V0OiBQcm94eURyYWZ0LFxuICBrZXk6IGFueSxcbiAgdmFsdWU6IGFueSxcbiAgZ2VuZXJhdGVQYXRjaGVzOiBHZW5lcmF0ZVBhdGNoZXNcbikge1xuICBjb25zdCBwcm94eURyYWZ0ID0gZ2V0UHJveHlEcmFmdCh2YWx1ZSk7XG4gIGlmIChwcm94eURyYWZ0KSB7XG4gICAgLy8gIWNhc2U6IGFzc2lnbiB0aGUgZHJhZnQgdmFsdWVcbiAgICBpZiAoIXByb3h5RHJhZnQuY2FsbGJhY2tzKSB7XG4gICAgICBwcm94eURyYWZ0LmNhbGxiYWNrcyA9IFtdO1xuICAgIH1cbiAgICBwcm94eURyYWZ0LmNhbGxiYWNrcy5wdXNoKChwYXRjaGVzLCBpbnZlcnNlUGF0Y2hlcykgPT4ge1xuICAgICAgY29uc3QgY29weSA9IHRhcmdldC50eXBlID09PSBEcmFmdFR5cGUuU2V0ID8gdGFyZ2V0LnNldE1hcCA6IHRhcmdldC5jb3B5O1xuICAgICAgaWYgKGlzRXF1YWwoZ2V0KGNvcHksIGtleSksIHZhbHVlKSkge1xuICAgICAgICBsZXQgdXBkYXRlZFZhbHVlID0gcHJveHlEcmFmdC5vcmlnaW5hbDtcbiAgICAgICAgaWYgKHByb3h5RHJhZnQuY29weSkge1xuICAgICAgICAgIHVwZGF0ZWRWYWx1ZSA9IHByb3h5RHJhZnQuY29weTtcbiAgICAgICAgfVxuICAgICAgICBmaW5hbGl6ZVNldFZhbHVlKHRhcmdldCk7XG4gICAgICAgIGZpbmFsaXplUGF0Y2hlcyh0YXJnZXQsIGdlbmVyYXRlUGF0Y2hlcywgcGF0Y2hlcywgaW52ZXJzZVBhdGNoZXMpO1xuICAgICAgICBpZiAoX19ERVZfXyAmJiB0YXJnZXQub3B0aW9ucy5lbmFibGVBdXRvRnJlZXplKSB7XG4gICAgICAgICAgdGFyZ2V0Lm9wdGlvbnMudXBkYXRlZFZhbHVlcyA9XG4gICAgICAgICAgICB0YXJnZXQub3B0aW9ucy51cGRhdGVkVmFsdWVzID8/IG5ldyBXZWFrTWFwKCk7XG4gICAgICAgICAgdGFyZ2V0Lm9wdGlvbnMudXBkYXRlZFZhbHVlcy5zZXQodXBkYXRlZFZhbHVlLCBwcm94eURyYWZ0Lm9yaWdpbmFsKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmaW5hbCB1cGRhdGUgdmFsdWVcbiAgICAgICAgc2V0KGNvcHksIGtleSwgdXBkYXRlZFZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAodGFyZ2V0Lm9wdGlvbnMuZW5hYmxlQXV0b0ZyZWV6ZSkge1xuICAgICAgLy8gIWNhc2U6IGFzc2lnbiB0aGUgZHJhZnQgdmFsdWUgaW4gY3Jvc3MgZHJhZnQgdHJlZVxuICAgICAgaWYgKHByb3h5RHJhZnQuZmluYWxpdGllcyAhPT0gdGFyZ2V0LmZpbmFsaXRpZXMpIHtcbiAgICAgICAgdGFyZ2V0Lm9wdGlvbnMuZW5hYmxlQXV0b0ZyZWV6ZSA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoaXNEcmFmdGFibGUodmFsdWUsIHRhcmdldC5vcHRpb25zKSkge1xuICAgIC8vICFjYXNlOiBhc3NpZ24gdGhlIG5vbi1kcmFmdCB2YWx1ZVxuICAgIHRhcmdldC5maW5hbGl0aWVzLmRyYWZ0LnB1c2goKCkgPT4ge1xuICAgICAgY29uc3QgY29weSA9IHRhcmdldC50eXBlID09PSBEcmFmdFR5cGUuU2V0ID8gdGFyZ2V0LnNldE1hcCA6IHRhcmdldC5jb3B5O1xuICAgICAgaWYgKGlzRXF1YWwoZ2V0KGNvcHksIGtleSksIHZhbHVlKSkge1xuICAgICAgICBmaW5hbGl6ZUFzc2lnbmVkKHRhcmdldCwga2V5KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuIiwgImltcG9ydCB7IERyYWZ0VHlwZSwgT3BlcmF0aW9uLCBQYXRjaGVzLCBQcm94eURyYWZ0IH0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgY2xvbmVJZk5lZWRlZCwgZXNjYXBlUGF0aCwgZ2V0LCBoYXMsIGlzRXF1YWwgfSBmcm9tICcuL3V0aWxzJztcblxuZnVuY3Rpb24gZ2VuZXJhdGVBcnJheVBhdGNoZXMoXG4gIHByb3h5U3RhdGU6IFByb3h5RHJhZnQ8QXJyYXk8YW55Pj4sXG4gIGJhc2VQYXRoOiBhbnlbXSxcbiAgcGF0Y2hlczogUGF0Y2hlcyxcbiAgaW52ZXJzZVBhdGNoZXM6IFBhdGNoZXMsXG4gIHBhdGhBc0FycmF5OiBib29sZWFuXG4pIHtcbiAgbGV0IHsgb3JpZ2luYWwsIGFzc2lnbmVkTWFwLCBvcHRpb25zIH0gPSBwcm94eVN0YXRlO1xuICBsZXQgY29weSA9IHByb3h5U3RhdGUuY29weSE7XG4gIGlmIChjb3B5Lmxlbmd0aCA8IG9yaWdpbmFsLmxlbmd0aCkge1xuICAgIFtvcmlnaW5hbCwgY29weV0gPSBbY29weSwgb3JpZ2luYWxdO1xuICAgIFtwYXRjaGVzLCBpbnZlcnNlUGF0Y2hlc10gPSBbaW52ZXJzZVBhdGNoZXMsIHBhdGNoZXNdO1xuICB9XG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBvcmlnaW5hbC5sZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBpZiAoYXNzaWduZWRNYXAhLmdldChpbmRleC50b1N0cmluZygpKSAmJiBjb3B5W2luZGV4XSAhPT0gb3JpZ2luYWxbaW5kZXhdKSB7XG4gICAgICBjb25zdCBfcGF0aCA9IGJhc2VQYXRoLmNvbmNhdChbaW5kZXhdKTtcbiAgICAgIGNvbnN0IHBhdGggPSBlc2NhcGVQYXRoKF9wYXRoLCBwYXRoQXNBcnJheSk7XG4gICAgICBwYXRjaGVzLnB1c2goe1xuICAgICAgICBvcDogT3BlcmF0aW9uLlJlcGxhY2UsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIC8vIElmIGl0IGlzIGEgZHJhZnQsIGl0IG5lZWRzIHRvIGJlIGRlZXAgY2xvbmVkLCBhbmQgaXQgbWF5IGFsc28gYmUgbm9uLWRyYWZ0LlxuICAgICAgICB2YWx1ZTogY2xvbmVJZk5lZWRlZChjb3B5W2luZGV4XSksXG4gICAgICB9KTtcbiAgICAgIGludmVyc2VQYXRjaGVzLnB1c2goe1xuICAgICAgICBvcDogT3BlcmF0aW9uLlJlcGxhY2UsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIC8vIElmIGl0IGlzIGEgZHJhZnQsIGl0IG5lZWRzIHRvIGJlIGRlZXAgY2xvbmVkLCBhbmQgaXQgbWF5IGFsc28gYmUgbm9uLWRyYWZ0LlxuICAgICAgICB2YWx1ZTogY2xvbmVJZk5lZWRlZChvcmlnaW5hbFtpbmRleF0pLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGZvciAobGV0IGluZGV4ID0gb3JpZ2luYWwubGVuZ3RoOyBpbmRleCA8IGNvcHkubGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgY29uc3QgX3BhdGggPSBiYXNlUGF0aC5jb25jYXQoW2luZGV4XSk7XG4gICAgY29uc3QgcGF0aCA9IGVzY2FwZVBhdGgoX3BhdGgsIHBhdGhBc0FycmF5KTtcbiAgICBwYXRjaGVzLnB1c2goe1xuICAgICAgb3A6IE9wZXJhdGlvbi5BZGQsXG4gICAgICBwYXRoLFxuICAgICAgLy8gSWYgaXQgaXMgYSBkcmFmdCwgaXQgbmVlZHMgdG8gYmUgZGVlcCBjbG9uZWQsIGFuZCBpdCBtYXkgYWxzbyBiZSBub24tZHJhZnQuXG4gICAgICB2YWx1ZTogY2xvbmVJZk5lZWRlZChjb3B5W2luZGV4XSksXG4gICAgfSk7XG4gIH1cbiAgaWYgKG9yaWdpbmFsLmxlbmd0aCA8IGNvcHkubGVuZ3RoKSB7XG4gICAgLy8gaHR0cHM6Ly93d3cucmZjLWVkaXRvci5vcmcvcmZjL3JmYzY5MDIjYXBwZW5kaXgtQS40XG4gICAgLy8gRm9yIHBlcmZvcm1hbmNlLCBoZXJlIHdlIG9ubHkgZ2VuZXJhdGUgYW4gb3BlcmF0aW9uIHRoYXQgcmVwbGFjZXMgdGhlIGxlbmd0aCBvZiB0aGUgYXJyYXksXG4gICAgLy8gd2hpY2ggaXMgaW5jb25zaXN0ZW50IHdpdGggSlNPTiBQYXRjaCBzcGVjaWZpY2F0aW9uXG4gICAgY29uc3QgeyBhcnJheUxlbmd0aEFzc2lnbm1lbnQgPSB0cnVlIH0gPSBvcHRpb25zLmVuYWJsZVBhdGNoZXM7XG4gICAgaWYgKGFycmF5TGVuZ3RoQXNzaWdubWVudCkge1xuICAgICAgY29uc3QgX3BhdGggPSBiYXNlUGF0aC5jb25jYXQoWydsZW5ndGgnXSk7XG4gICAgICBjb25zdCBwYXRoID0gZXNjYXBlUGF0aChfcGF0aCwgcGF0aEFzQXJyYXkpO1xuICAgICAgaW52ZXJzZVBhdGNoZXMucHVzaCh7XG4gICAgICAgIG9wOiBPcGVyYXRpb24uUmVwbGFjZSxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgdmFsdWU6IG9yaWdpbmFsLmxlbmd0aCxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGxldCBpbmRleCA9IGNvcHkubGVuZ3RoOyBvcmlnaW5hbC5sZW5ndGggPCBpbmRleDsgaW5kZXggLT0gMSkge1xuICAgICAgICBjb25zdCBfcGF0aCA9IGJhc2VQYXRoLmNvbmNhdChbaW5kZXggLSAxXSk7XG4gICAgICAgIGNvbnN0IHBhdGggPSBlc2NhcGVQYXRoKF9wYXRoLCBwYXRoQXNBcnJheSk7XG4gICAgICAgIGludmVyc2VQYXRjaGVzLnB1c2goe1xuICAgICAgICAgIG9wOiBPcGVyYXRpb24uUmVtb3ZlLFxuICAgICAgICAgIHBhdGgsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVBhdGNoZXNGcm9tQXNzaWduZWQoXG4gIHsgb3JpZ2luYWwsIGNvcHksIGFzc2lnbmVkTWFwIH06IFByb3h5RHJhZnQ8UmVjb3JkPHN0cmluZywgYW55Pj4sXG4gIGJhc2VQYXRoOiBhbnlbXSxcbiAgcGF0Y2hlczogUGF0Y2hlcyxcbiAgaW52ZXJzZVBhdGNoZXM6IFBhdGNoZXMsXG4gIHBhdGhBc0FycmF5OiBib29sZWFuXG4pIHtcbiAgYXNzaWduZWRNYXAhLmZvckVhY2goKGFzc2lnbmVkVmFsdWUsIGtleSkgPT4ge1xuICAgIGNvbnN0IG9yaWdpbmFsVmFsdWUgPSBnZXQob3JpZ2luYWwsIGtleSk7XG4gICAgY29uc3QgdmFsdWUgPSBjbG9uZUlmTmVlZGVkKGdldChjb3B5LCBrZXkpKTtcbiAgICBjb25zdCBvcCA9ICFhc3NpZ25lZFZhbHVlXG4gICAgICA/IE9wZXJhdGlvbi5SZW1vdmVcbiAgICAgIDogaGFzKG9yaWdpbmFsLCBrZXkpXG4gICAgICAgID8gT3BlcmF0aW9uLlJlcGxhY2VcbiAgICAgICAgOiBPcGVyYXRpb24uQWRkO1xuICAgIGlmIChpc0VxdWFsKG9yaWdpbmFsVmFsdWUsIHZhbHVlKSAmJiBvcCA9PT0gT3BlcmF0aW9uLlJlcGxhY2UpIHJldHVybjtcbiAgICBjb25zdCBfcGF0aCA9IGJhc2VQYXRoLmNvbmNhdChrZXkpO1xuICAgIGNvbnN0IHBhdGggPSBlc2NhcGVQYXRoKF9wYXRoLCBwYXRoQXNBcnJheSk7XG4gICAgcGF0Y2hlcy5wdXNoKG9wID09PSBPcGVyYXRpb24uUmVtb3ZlID8geyBvcCwgcGF0aCB9IDogeyBvcCwgcGF0aCwgdmFsdWUgfSk7XG4gICAgaW52ZXJzZVBhdGNoZXMucHVzaChcbiAgICAgIG9wID09PSBPcGVyYXRpb24uQWRkXG4gICAgICAgID8geyBvcDogT3BlcmF0aW9uLlJlbW92ZSwgcGF0aCB9XG4gICAgICAgIDogb3AgPT09IE9wZXJhdGlvbi5SZW1vdmVcbiAgICAgICAgICA/IHsgb3A6IE9wZXJhdGlvbi5BZGQsIHBhdGgsIHZhbHVlOiBvcmlnaW5hbFZhbHVlIH1cbiAgICAgICAgICA6IHsgb3A6IE9wZXJhdGlvbi5SZXBsYWNlLCBwYXRoLCB2YWx1ZTogb3JpZ2luYWxWYWx1ZSB9XG4gICAgKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlU2V0UGF0Y2hlcyhcbiAgeyBvcmlnaW5hbCwgY29weSB9OiBQcm94eURyYWZ0PFNldDxhbnk+PixcbiAgYmFzZVBhdGg6IGFueVtdLFxuICBwYXRjaGVzOiBQYXRjaGVzLFxuICBpbnZlcnNlUGF0Y2hlczogUGF0Y2hlcyxcbiAgcGF0aEFzQXJyYXk6IGJvb2xlYW5cbikge1xuICBsZXQgaW5kZXggPSAwO1xuICBvcmlnaW5hbC5mb3JFYWNoKCh2YWx1ZTogYW55KSA9PiB7XG4gICAgaWYgKCFjb3B5IS5oYXModmFsdWUpKSB7XG4gICAgICBjb25zdCBfcGF0aCA9IGJhc2VQYXRoLmNvbmNhdChbaW5kZXhdKTtcbiAgICAgIGNvbnN0IHBhdGggPSBlc2NhcGVQYXRoKF9wYXRoLCBwYXRoQXNBcnJheSk7XG4gICAgICBwYXRjaGVzLnB1c2goe1xuICAgICAgICBvcDogT3BlcmF0aW9uLlJlbW92ZSxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgdmFsdWUsXG4gICAgICB9KTtcbiAgICAgIGludmVyc2VQYXRjaGVzLnVuc2hpZnQoe1xuICAgICAgICBvcDogT3BlcmF0aW9uLkFkZCxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgdmFsdWUsXG4gICAgICB9KTtcbiAgICB9XG4gICAgaW5kZXggKz0gMTtcbiAgfSk7XG4gIGluZGV4ID0gMDtcbiAgY29weSEuZm9yRWFjaCgodmFsdWU6IGFueSkgPT4ge1xuICAgIGlmICghb3JpZ2luYWwuaGFzKHZhbHVlKSkge1xuICAgICAgY29uc3QgX3BhdGggPSBiYXNlUGF0aC5jb25jYXQoW2luZGV4XSk7XG4gICAgICBjb25zdCBwYXRoID0gZXNjYXBlUGF0aChfcGF0aCwgcGF0aEFzQXJyYXkpO1xuICAgICAgcGF0Y2hlcy5wdXNoKHtcbiAgICAgICAgb3A6IE9wZXJhdGlvbi5BZGQsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIHZhbHVlLFxuICAgICAgfSk7XG4gICAgICBpbnZlcnNlUGF0Y2hlcy51bnNoaWZ0KHtcbiAgICAgICAgb3A6IE9wZXJhdGlvbi5SZW1vdmUsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIHZhbHVlLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGluZGV4ICs9IDE7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVQYXRjaGVzKFxuICBwcm94eVN0YXRlOiBQcm94eURyYWZ0LFxuICBiYXNlUGF0aDogYW55W10sXG4gIHBhdGNoZXM6IFBhdGNoZXMsXG4gIGludmVyc2VQYXRjaGVzOiBQYXRjaGVzXG4pIHtcbiAgY29uc3QgeyBwYXRoQXNBcnJheSA9IHRydWUgfSA9IHByb3h5U3RhdGUub3B0aW9ucy5lbmFibGVQYXRjaGVzO1xuICBzd2l0Y2ggKHByb3h5U3RhdGUudHlwZSkge1xuICAgIGNhc2UgRHJhZnRUeXBlLk9iamVjdDpcbiAgICBjYXNlIERyYWZ0VHlwZS5NYXA6XG4gICAgICByZXR1cm4gZ2VuZXJhdGVQYXRjaGVzRnJvbUFzc2lnbmVkKFxuICAgICAgICBwcm94eVN0YXRlLFxuICAgICAgICBiYXNlUGF0aCxcbiAgICAgICAgcGF0Y2hlcyxcbiAgICAgICAgaW52ZXJzZVBhdGNoZXMsXG4gICAgICAgIHBhdGhBc0FycmF5XG4gICAgICApO1xuICAgIGNhc2UgRHJhZnRUeXBlLkFycmF5OlxuICAgICAgcmV0dXJuIGdlbmVyYXRlQXJyYXlQYXRjaGVzKFxuICAgICAgICBwcm94eVN0YXRlLFxuICAgICAgICBiYXNlUGF0aCxcbiAgICAgICAgcGF0Y2hlcyxcbiAgICAgICAgaW52ZXJzZVBhdGNoZXMsXG4gICAgICAgIHBhdGhBc0FycmF5XG4gICAgICApO1xuICAgIGNhc2UgRHJhZnRUeXBlLlNldDpcbiAgICAgIHJldHVybiBnZW5lcmF0ZVNldFBhdGNoZXMoXG4gICAgICAgIHByb3h5U3RhdGUsXG4gICAgICAgIGJhc2VQYXRoLFxuICAgICAgICBwYXRjaGVzLFxuICAgICAgICBpbnZlcnNlUGF0Y2hlcyxcbiAgICAgICAgcGF0aEFzQXJyYXlcbiAgICAgICk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBPcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgaXNEcmFmdGFibGUgfSBmcm9tICcuL3V0aWxzJztcblxubGV0IHJlYWRhYmxlID0gZmFsc2U7XG5cbmV4cG9ydCBjb25zdCBjaGVja1JlYWRhYmxlID0gKFxuICB2YWx1ZTogYW55LFxuICBvcHRpb25zOiBPcHRpb25zPGFueSwgYW55PixcbiAgaWdub3JlQ2hlY2tEcmFmdGFibGUgPSBmYWxzZVxuKSA9PiB7XG4gIGlmIChcbiAgICB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmXG4gICAgdmFsdWUgIT09IG51bGwgJiZcbiAgICAoIWlzRHJhZnRhYmxlKHZhbHVlLCBvcHRpb25zKSB8fCBpZ25vcmVDaGVja0RyYWZ0YWJsZSkgJiZcbiAgICAhcmVhZGFibGVcbiAgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFN0cmljdCBtb2RlOiBNdXRhYmxlIGRhdGEgY2Fubm90IGJlIGFjY2Vzc2VkIGRpcmVjdGx5LCBwbGVhc2UgdXNlICd1bnNhZmUoY2FsbGJhY2spJyB3cmFwLmBcbiAgICApO1xuICB9XG59O1xuXG4vKipcbiAqIGB1bnNhZmUoY2FsbGJhY2spYCB0byBhY2Nlc3MgbXV0YWJsZSBkYXRhIGRpcmVjdGx5IGluIHN0cmljdCBtb2RlLlxuICpcbiAqICMjIEV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgY3JlYXRlLCB1bnNhZmUgfSBmcm9tICcuLi9pbmRleCc7XG4gKlxuICogY2xhc3MgRm9vYmFyIHtcbiAqICAgYmFyID0gMTtcbiAqIH1cbiAqXG4gKiBjb25zdCBiYXNlU3RhdGUgPSB7IGZvb2JhcjogbmV3IEZvb2JhcigpIH07XG4gKiBjb25zdCBzdGF0ZSA9IGNyZWF0ZShcbiAqICAgYmFzZVN0YXRlLFxuICogICAoZHJhZnQpID0+IHtcbiAqICAgIHVuc2FmZSgoKSA9PiB7XG4gKiAgICAgIGRyYWZ0LmZvb2Jhci5iYXIgPSAyO1xuICogICAgfSk7XG4gKiAgIH0sXG4gKiAgIHtcbiAqICAgICBzdHJpY3Q6IHRydWUsXG4gKiAgIH1cbiAqICk7XG4gKlxuICogZXhwZWN0KHN0YXRlKS50b0JlKGJhc2VTdGF0ZSk7XG4gKiBleHBlY3Qoc3RhdGUuZm9vYmFyKS50b0JlKGJhc2VTdGF0ZS5mb29iYXIpO1xuICogZXhwZWN0KHN0YXRlLmZvb2Jhci5iYXIpLnRvQmUoMik7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuc2FmZTxUPihjYWxsYmFjazogKCkgPT4gVCk6IFQge1xuICByZWFkYWJsZSA9IHRydWU7XG4gIGxldCByZXN1bHQ6IFQ7XG4gIHRyeSB7XG4gICAgcmVzdWx0ID0gY2FsbGJhY2soKTtcbiAgfSBmaW5hbGx5IHtcbiAgICByZWFkYWJsZSA9IGZhbHNlO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG4iLCAiaW1wb3J0IHsgZGF0YVR5cGVzLCBpdGVyYXRvclN5bWJvbCB9IGZyb20gJy4vY29uc3RhbnQnO1xuaW1wb3J0IHsgaW50ZXJuYWwgfSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IGdlbmVyYXRlUGF0Y2hlcyB9IGZyb20gJy4vcGF0Y2gnO1xuaW1wb3J0IHsgY2hlY2tSZWFkYWJsZSB9IGZyb20gJy4vdW5zYWZlJztcbmltcG9ydCB7XG4gIGVuc3VyZVNoYWxsb3dDb3B5LFxuICBnZXRQcm94eURyYWZ0LFxuICBpc0RyYWZ0YWJsZSxcbiAgaXNFcXVhbCxcbiAgbGF0ZXN0LFxuICBtYXJrQ2hhbmdlZCxcbiAgbWFya0ZpbmFsaXphdGlvbixcbn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjb25zdCBtYXBIYW5kbGVyID0ge1xuICBnZXQgc2l6ZSgpIHtcbiAgICBjb25zdCBjdXJyZW50OiBNYXA8YW55LCBhbnk+ID0gbGF0ZXN0KGdldFByb3h5RHJhZnQodGhpcykhKTtcbiAgICByZXR1cm4gY3VycmVudC5zaXplO1xuICB9LFxuICBoYXMoa2V5OiBhbnkpOiBib29sZWFuIHtcbiAgICByZXR1cm4gbGF0ZXN0KGdldFByb3h5RHJhZnQodGhpcykhKS5oYXMoa2V5KTtcbiAgfSxcbiAgc2V0KGtleTogYW55LCB2YWx1ZTogYW55KSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZ2V0UHJveHlEcmFmdCh0aGlzKSE7XG4gICAgY29uc3Qgc291cmNlID0gbGF0ZXN0KHRhcmdldCk7XG4gICAgaWYgKCFzb3VyY2UuaGFzKGtleSkgfHwgIWlzRXF1YWwoc291cmNlLmdldChrZXkpLCB2YWx1ZSkpIHtcbiAgICAgIGVuc3VyZVNoYWxsb3dDb3B5KHRhcmdldCk7XG4gICAgICBtYXJrQ2hhbmdlZCh0YXJnZXQpO1xuICAgICAgdGFyZ2V0LmFzc2lnbmVkTWFwIS5zZXQoa2V5LCB0cnVlKTtcbiAgICAgIHRhcmdldC5jb3B5LnNldChrZXksIHZhbHVlKTtcbiAgICAgIG1hcmtGaW5hbGl6YXRpb24odGFyZ2V0LCBrZXksIHZhbHVlLCBnZW5lcmF0ZVBhdGNoZXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZGVsZXRlKGtleTogYW55KTogYm9vbGVhbiB7XG4gICAgaWYgKCF0aGlzLmhhcyhrZXkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IHRhcmdldCA9IGdldFByb3h5RHJhZnQodGhpcykhO1xuICAgIGVuc3VyZVNoYWxsb3dDb3B5KHRhcmdldCk7XG4gICAgbWFya0NoYW5nZWQodGFyZ2V0KTtcbiAgICBpZiAodGFyZ2V0Lm9yaWdpbmFsLmhhcyhrZXkpKSB7XG4gICAgICB0YXJnZXQuYXNzaWduZWRNYXAhLnNldChrZXksIGZhbHNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0LmFzc2lnbmVkTWFwIS5kZWxldGUoa2V5KTtcbiAgICB9XG4gICAgdGFyZ2V0LmNvcHkuZGVsZXRlKGtleSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIGNsZWFyKCkge1xuICAgIGNvbnN0IHRhcmdldCA9IGdldFByb3h5RHJhZnQodGhpcykhO1xuICAgIGlmICghdGhpcy5zaXplKSByZXR1cm47XG4gICAgZW5zdXJlU2hhbGxvd0NvcHkodGFyZ2V0KTtcbiAgICBtYXJrQ2hhbmdlZCh0YXJnZXQpO1xuICAgIHRhcmdldC5hc3NpZ25lZE1hcCA9IG5ldyBNYXAoKTtcbiAgICBmb3IgKGNvbnN0IFtrZXldIG9mIHRhcmdldC5vcmlnaW5hbCkge1xuICAgICAgdGFyZ2V0LmFzc2lnbmVkTWFwLnNldChrZXksIGZhbHNlKTtcbiAgICB9XG4gICAgdGFyZ2V0LmNvcHkhLmNsZWFyKCk7XG4gIH0sXG4gIGZvckVhY2goY2FsbGJhY2s6ICh2YWx1ZTogYW55LCBrZXk6IGFueSwgc2VsZjogYW55KSA9PiB2b2lkLCB0aGlzQXJnPzogYW55KSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZ2V0UHJveHlEcmFmdCh0aGlzKSE7XG4gICAgbGF0ZXN0KHRhcmdldCkuZm9yRWFjaCgoX3ZhbHVlOiBhbnksIF9rZXk6IGFueSkgPT4ge1xuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLmdldChfa2V5KSwgX2tleSwgdGhpcyk7XG4gICAgfSk7XG4gIH0sXG4gIGdldChrZXk6IGFueSk6IGFueSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZ2V0UHJveHlEcmFmdCh0aGlzKSE7XG4gICAgY29uc3QgdmFsdWUgPSBsYXRlc3QodGFyZ2V0KS5nZXQoa2V5KTtcbiAgICBjb25zdCBtdXRhYmxlID1cbiAgICAgIHRhcmdldC5vcHRpb25zLm1hcms/Lih2YWx1ZSwgZGF0YVR5cGVzKSA9PT0gZGF0YVR5cGVzLm11dGFibGU7XG4gICAgaWYgKHRhcmdldC5vcHRpb25zLnN0cmljdCkge1xuICAgICAgY2hlY2tSZWFkYWJsZSh2YWx1ZSwgdGFyZ2V0Lm9wdGlvbnMsIG11dGFibGUpO1xuICAgIH1cbiAgICBpZiAobXV0YWJsZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBpZiAodGFyZ2V0LmZpbmFsaXplZCB8fCAhaXNEcmFmdGFibGUodmFsdWUsIHRhcmdldC5vcHRpb25zKSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICAvLyBkcmFmdGVkIG9yIHJlYXNzaWduZWRcbiAgICBpZiAodmFsdWUgIT09IHRhcmdldC5vcmlnaW5hbC5nZXQoa2V5KSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBjb25zdCBkcmFmdCA9IGludGVybmFsLmNyZWF0ZURyYWZ0KHtcbiAgICAgIG9yaWdpbmFsOiB2YWx1ZSxcbiAgICAgIHBhcmVudERyYWZ0OiB0YXJnZXQsXG4gICAgICBrZXksXG4gICAgICBmaW5hbGl0aWVzOiB0YXJnZXQuZmluYWxpdGllcyxcbiAgICAgIG9wdGlvbnM6IHRhcmdldC5vcHRpb25zLFxuICAgIH0pO1xuICAgIGVuc3VyZVNoYWxsb3dDb3B5KHRhcmdldCk7XG4gICAgdGFyZ2V0LmNvcHkuc2V0KGtleSwgZHJhZnQpO1xuICAgIHJldHVybiBkcmFmdDtcbiAgfSxcbiAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPGFueT4ge1xuICAgIHJldHVybiBsYXRlc3QoZ2V0UHJveHlEcmFmdCh0aGlzKSEpLmtleXMoKTtcbiAgfSxcbiAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8YW55PiB7XG4gICAgY29uc3QgaXRlcmF0b3IgPSB0aGlzLmtleXMoKTtcbiAgICByZXR1cm4ge1xuICAgICAgW2l0ZXJhdG9yU3ltYm9sXTogKCkgPT4gdGhpcy52YWx1ZXMoKSxcbiAgICAgIG5leHQ6ICgpID0+IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAocmVzdWx0LmRvbmUpIHJldHVybiByZXN1bHQ7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5nZXQocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgfSBhcyBhbnk7XG4gIH0sXG4gIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbYW55LCBhbnldPiB7XG4gICAgY29uc3QgaXRlcmF0b3IgPSB0aGlzLmtleXMoKTtcbiAgICByZXR1cm4ge1xuICAgICAgW2l0ZXJhdG9yU3ltYm9sXTogKCkgPT4gdGhpcy5lbnRyaWVzKCksXG4gICAgICBuZXh0OiAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHJlc3VsdC5kb25lKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZ2V0KHJlc3VsdC52YWx1ZSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgdmFsdWU6IFtyZXN1bHQudmFsdWUsIHZhbHVlXSxcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgfSBhcyBhbnk7XG4gIH0sXG4gIFtpdGVyYXRvclN5bWJvbF0oKSB7XG4gICAgcmV0dXJuIHRoaXMuZW50cmllcygpO1xuICB9LFxufTtcblxuZXhwb3J0IGNvbnN0IG1hcEhhbmRsZXJLZXlzID0gUmVmbGVjdC5vd25LZXlzKG1hcEhhbmRsZXIpO1xuIiwgImltcG9ydCB7IFByb3h5RHJhZnQgfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBkYXRhVHlwZXMsIGl0ZXJhdG9yU3ltYm9sIH0gZnJvbSAnLi9jb25zdGFudCc7XG5pbXBvcnQgeyBpbnRlcm5hbCB9IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHtcbiAgZW5zdXJlU2hhbGxvd0NvcHksXG4gIGdldFByb3h5RHJhZnQsXG4gIGlzRHJhZnRhYmxlLFxuICBtYXJrQ2hhbmdlZCxcbiAgbWFya0ZpbmFsaXphdGlvbixcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBjaGVja1JlYWRhYmxlIH0gZnJvbSAnLi91bnNhZmUnO1xuaW1wb3J0IHsgZ2VuZXJhdGVQYXRjaGVzIH0gZnJvbSAnLi9wYXRjaCc7XG5cbmNvbnN0IGdldE5leHRJdGVyYXRvciA9XG4gIChcbiAgICB0YXJnZXQ6IFByb3h5RHJhZnQ8YW55PixcbiAgICBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxhbnk+LFxuICAgIHsgaXNWYWx1ZXNJdGVyYXRvciB9OiB7IGlzVmFsdWVzSXRlcmF0b3I6IGJvb2xlYW4gfVxuICApID0+XG4gICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgaWYgKHJlc3VsdC5kb25lKSByZXR1cm4gcmVzdWx0O1xuICAgIGNvbnN0IGtleSA9IHJlc3VsdC52YWx1ZSBhcyBhbnk7XG4gICAgbGV0IHZhbHVlID0gdGFyZ2V0LnNldE1hcCEuZ2V0KGtleSk7XG4gICAgY29uc3QgY3VycmVudERyYWZ0ID0gZ2V0UHJveHlEcmFmdCh2YWx1ZSk7XG4gICAgY29uc3QgbXV0YWJsZSA9XG4gICAgICB0YXJnZXQub3B0aW9ucy5tYXJrPy4odmFsdWUsIGRhdGFUeXBlcykgPT09IGRhdGFUeXBlcy5tdXRhYmxlO1xuICAgIGlmICh0YXJnZXQub3B0aW9ucy5zdHJpY3QpIHtcbiAgICAgIGNoZWNrUmVhZGFibGUoa2V5LCB0YXJnZXQub3B0aW9ucywgbXV0YWJsZSk7XG4gICAgfVxuICAgIGlmIChcbiAgICAgICFtdXRhYmxlICYmXG4gICAgICAhY3VycmVudERyYWZ0ICYmXG4gICAgICBpc0RyYWZ0YWJsZShrZXksIHRhcmdldC5vcHRpb25zKSAmJlxuICAgICAgIXRhcmdldC5maW5hbGl6ZWQgJiZcbiAgICAgIHRhcmdldC5vcmlnaW5hbCEuaGFzKGtleSlcbiAgICApIHtcbiAgICAgIC8vIGRyYWZ0IGEgZHJhZnRhYmxlIG9yaWdpbmFsIHNldCBpdGVtXG4gICAgICBjb25zdCBwcm94eSA9IGludGVybmFsLmNyZWF0ZURyYWZ0KHtcbiAgICAgICAgb3JpZ2luYWw6IGtleSxcbiAgICAgICAgcGFyZW50RHJhZnQ6IHRhcmdldCxcbiAgICAgICAga2V5LFxuICAgICAgICBmaW5hbGl0aWVzOiB0YXJnZXQuZmluYWxpdGllcyxcbiAgICAgICAgb3B0aW9uczogdGFyZ2V0Lm9wdGlvbnMsXG4gICAgICB9KTtcbiAgICAgIHRhcmdldC5zZXRNYXAhLnNldChrZXksIHByb3h5KTtcbiAgICAgIHZhbHVlID0gcHJveHk7XG4gICAgfSBlbHNlIGlmIChjdXJyZW50RHJhZnQpIHtcbiAgICAgIC8vIGRyYWZ0ZWRcbiAgICAgIHZhbHVlID0gY3VycmVudERyYWZ0LnByb3h5O1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgZG9uZTogZmFsc2UsXG4gICAgICB2YWx1ZTogaXNWYWx1ZXNJdGVyYXRvciA/IHZhbHVlIDogW3ZhbHVlLCB2YWx1ZV0sXG4gICAgfTtcbiAgfTtcblxuZXhwb3J0IGNvbnN0IHNldEhhbmRsZXIgPSB7XG4gIGdldCBzaXplKCkge1xuICAgIGNvbnN0IHRhcmdldDogUHJveHlEcmFmdDxhbnk+ID0gZ2V0UHJveHlEcmFmdCh0aGlzKSE7XG4gICAgcmV0dXJuIHRhcmdldC5zZXRNYXAhLnNpemU7XG4gIH0sXG4gIGhhcyh2YWx1ZTogYW55KSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZ2V0UHJveHlEcmFmdCh0aGlzKSE7XG4gICAgLy8gcmVhc3NpZ25lZCBvciBub24tZHJhZnRhYmxlIHZhbHVlc1xuICAgIGlmICh0YXJnZXQuc2V0TWFwIS5oYXModmFsdWUpKSByZXR1cm4gdHJ1ZTtcbiAgICBlbnN1cmVTaGFsbG93Q29weSh0YXJnZXQpO1xuICAgIGNvbnN0IHZhbHVlUHJveHlEcmFmdCA9IGdldFByb3h5RHJhZnQodmFsdWUpITtcbiAgICAvLyBkcmFmdGVkXG4gICAgaWYgKHZhbHVlUHJveHlEcmFmdCAmJiB0YXJnZXQuc2V0TWFwIS5oYXModmFsdWVQcm94eURyYWZ0Lm9yaWdpbmFsKSlcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcbiAgYWRkKHZhbHVlOiBhbnkpIHtcbiAgICBjb25zdCB0YXJnZXQgPSBnZXRQcm94eURyYWZ0KHRoaXMpITtcbiAgICBpZiAoIXRoaXMuaGFzKHZhbHVlKSkge1xuICAgICAgZW5zdXJlU2hhbGxvd0NvcHkodGFyZ2V0KTtcbiAgICAgIG1hcmtDaGFuZ2VkKHRhcmdldCk7XG4gICAgICB0YXJnZXQuYXNzaWduZWRNYXAhLnNldCh2YWx1ZSwgdHJ1ZSk7XG4gICAgICB0YXJnZXQuc2V0TWFwIS5zZXQodmFsdWUsIHZhbHVlKTtcbiAgICAgIG1hcmtGaW5hbGl6YXRpb24odGFyZ2V0LCB2YWx1ZSwgdmFsdWUsIGdlbmVyYXRlUGF0Y2hlcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBkZWxldGUodmFsdWU6IGFueSk6IGJvb2xlYW4ge1xuICAgIGlmICghdGhpcy5oYXModmFsdWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IHRhcmdldCA9IGdldFByb3h5RHJhZnQodGhpcykhO1xuICAgIGVuc3VyZVNoYWxsb3dDb3B5KHRhcmdldCk7XG4gICAgbWFya0NoYW5nZWQodGFyZ2V0KTtcbiAgICBjb25zdCB2YWx1ZVByb3h5RHJhZnQgPSBnZXRQcm94eURyYWZ0KHZhbHVlKSE7XG4gICAgaWYgKHZhbHVlUHJveHlEcmFmdCAmJiB0YXJnZXQuc2V0TWFwIS5oYXModmFsdWVQcm94eURyYWZ0Lm9yaWdpbmFsKSkge1xuICAgICAgLy8gZGVsZXRlIGRyYWZ0ZWRcbiAgICAgIHRhcmdldC5hc3NpZ25lZE1hcCEuc2V0KHZhbHVlUHJveHlEcmFmdC5vcmlnaW5hbCwgZmFsc2UpO1xuICAgICAgcmV0dXJuIHRhcmdldC5zZXRNYXAhLmRlbGV0ZSh2YWx1ZVByb3h5RHJhZnQub3JpZ2luYWwpO1xuICAgIH1cbiAgICBpZiAoIXZhbHVlUHJveHlEcmFmdCAmJiB0YXJnZXQuc2V0TWFwIS5oYXModmFsdWUpKSB7XG4gICAgICAvLyBub24tZHJhZnRhYmxlIHZhbHVlc1xuICAgICAgdGFyZ2V0LmFzc2lnbmVkTWFwIS5zZXQodmFsdWUsIGZhbHNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gcmVhc3NpZ25lZFxuICAgICAgdGFyZ2V0LmFzc2lnbmVkTWFwIS5kZWxldGUodmFsdWUpO1xuICAgIH1cbiAgICAvLyBkZWxldGUgcmVhc3NpZ25lZCBvciBub24tZHJhZnRhYmxlIHZhbHVlc1xuICAgIHJldHVybiB0YXJnZXQuc2V0TWFwIS5kZWxldGUodmFsdWUpO1xuICB9LFxuICBjbGVhcigpIHtcbiAgICBpZiAoIXRoaXMuc2l6ZSkgcmV0dXJuO1xuICAgIGNvbnN0IHRhcmdldCA9IGdldFByb3h5RHJhZnQodGhpcykhO1xuICAgIGVuc3VyZVNoYWxsb3dDb3B5KHRhcmdldCk7XG4gICAgbWFya0NoYW5nZWQodGFyZ2V0KTtcbiAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIHRhcmdldC5vcmlnaW5hbCkge1xuICAgICAgdGFyZ2V0LmFzc2lnbmVkTWFwIS5zZXQodmFsdWUsIGZhbHNlKTtcbiAgICB9XG4gICAgdGFyZ2V0LnNldE1hcCEuY2xlYXIoKTtcbiAgfSxcbiAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8YW55PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZ2V0UHJveHlEcmFmdCh0aGlzKSE7XG4gICAgZW5zdXJlU2hhbGxvd0NvcHkodGFyZ2V0KTtcbiAgICBjb25zdCBpdGVyYXRvciA9IHRhcmdldC5zZXRNYXAhLmtleXMoKTtcbiAgICByZXR1cm4ge1xuICAgICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IHRoaXMudmFsdWVzKCksXG4gICAgICBuZXh0OiBnZXROZXh0SXRlcmF0b3IodGFyZ2V0LCBpdGVyYXRvciwgeyBpc1ZhbHVlc0l0ZXJhdG9yOiB0cnVlIH0pLFxuICAgIH07XG4gIH0sXG4gIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbYW55LCBhbnldPiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZ2V0UHJveHlEcmFmdCh0aGlzKSE7XG4gICAgZW5zdXJlU2hhbGxvd0NvcHkodGFyZ2V0KTtcbiAgICBjb25zdCBpdGVyYXRvciA9IHRhcmdldC5zZXRNYXAhLmtleXMoKTtcbiAgICByZXR1cm4ge1xuICAgICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IHRoaXMuZW50cmllcygpLFxuICAgICAgbmV4dDogZ2V0TmV4dEl0ZXJhdG9yKHRhcmdldCwgaXRlcmF0b3IsIHtcbiAgICAgICAgaXNWYWx1ZXNJdGVyYXRvcjogZmFsc2UsXG4gICAgICB9KSBhcyAoKSA9PiBJdGVyYXRvclJldHVyblJlc3VsdDxhbnk+LFxuICAgIH07XG4gIH0sXG4gIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxhbnk+IHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMoKTtcbiAgfSxcbiAgW2l0ZXJhdG9yU3ltYm9sXSgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMoKTtcbiAgfSxcbiAgZm9yRWFjaChjYWxsYmFjazogYW55LCB0aGlzQXJnPzogYW55KSB7XG4gICAgY29uc3QgaXRlcmF0b3IgPSB0aGlzLnZhbHVlcygpO1xuICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCByZXN1bHQudmFsdWUsIHJlc3VsdC52YWx1ZSwgdGhpcyk7XG4gICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgfVxuICB9LFxufTtcblxuaWYgKFNldC5wcm90b3R5cGUuZGlmZmVyZW5jZSkge1xuICAvLyBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5ldyBTZXQgbWV0aG9kc1xuICAvLyBodHRwczovL2dpdGh1Yi5jb20vdGMzOS9wcm9wb3NhbC1zZXQtbWV0aG9kc1xuICAvLyBBbmQgYGh0dHBzOi8vZ2l0aHViLmNvbS90YzM5L3Byb3Bvc2FsLXNldC1tZXRob2RzL2Jsb2IvbWFpbi9kZXRhaWxzLm1kI3N5bWJvbHNwZWNpZXNgIGhhcyBzb21lIGRldGFpbHMgYWJvdXQgdGhlIGBAQHNwZWNpZXNgIHN5bWJvbC5cbiAgLy8gU28gd2UgY2FuJ3QgdXNlIFN1YlNldCBpbnN0YW5jZSBjb25zdHJ1Y3RvciB0byBnZXQgdGhlIGNvbnN0cnVjdG9yIG9mIHRoZSBTdWJTZXQgaW5zdGFuY2UuXG4gIE9iamVjdC5hc3NpZ24oc2V0SGFuZGxlciwge1xuICAgIGludGVyc2VjdGlvbih0aGlzOiBTZXQ8YW55Piwgb3RoZXI6IFJlYWRvbmx5U2V0TGlrZTxhbnk+KTogU2V0PGFueT4ge1xuICAgICAgcmV0dXJuIFNldC5wcm90b3R5cGUuaW50ZXJzZWN0aW9uLmNhbGwobmV3IFNldCh0aGlzLnZhbHVlcygpKSwgb3RoZXIpO1xuICAgIH0sXG4gICAgdW5pb24odGhpczogU2V0PGFueT4sIG90aGVyOiBSZWFkb25seVNldExpa2U8YW55Pik6IFNldDxhbnk+IHtcbiAgICAgIHJldHVybiBTZXQucHJvdG90eXBlLnVuaW9uLmNhbGwobmV3IFNldCh0aGlzLnZhbHVlcygpKSwgb3RoZXIpO1xuICAgIH0sXG4gICAgZGlmZmVyZW5jZSh0aGlzOiBTZXQ8YW55Piwgb3RoZXI6IFJlYWRvbmx5U2V0TGlrZTxhbnk+KTogU2V0PGFueT4ge1xuICAgICAgcmV0dXJuIFNldC5wcm90b3R5cGUuZGlmZmVyZW5jZS5jYWxsKG5ldyBTZXQodGhpcy52YWx1ZXMoKSksIG90aGVyKTtcbiAgICB9LFxuICAgIHN5bW1ldHJpY0RpZmZlcmVuY2UodGhpczogU2V0PGFueT4sIG90aGVyOiBSZWFkb25seVNldExpa2U8YW55Pik6IFNldDxhbnk+IHtcbiAgICAgIHJldHVybiBTZXQucHJvdG90eXBlLnN5bW1ldHJpY0RpZmZlcmVuY2UuY2FsbChcbiAgICAgICAgbmV3IFNldCh0aGlzLnZhbHVlcygpKSxcbiAgICAgICAgb3RoZXJcbiAgICAgICk7XG4gICAgfSxcbiAgICBpc1N1YnNldE9mKHRoaXM6IFNldDxhbnk+LCBvdGhlcjogUmVhZG9ubHlTZXRMaWtlPGFueT4pOiBib29sZWFuIHtcbiAgICAgIHJldHVybiBTZXQucHJvdG90eXBlLmlzU3Vic2V0T2YuY2FsbChuZXcgU2V0KHRoaXMudmFsdWVzKCkpLCBvdGhlcik7XG4gICAgfSxcbiAgICBpc1N1cGVyc2V0T2YodGhpczogU2V0PGFueT4sIG90aGVyOiBSZWFkb25seVNldExpa2U8YW55Pik6IGJvb2xlYW4ge1xuICAgICAgcmV0dXJuIFNldC5wcm90b3R5cGUuaXNTdXBlcnNldE9mLmNhbGwobmV3IFNldCh0aGlzLnZhbHVlcygpKSwgb3RoZXIpO1xuICAgIH0sXG4gICAgaXNEaXNqb2ludEZyb20odGhpczogU2V0PGFueT4sIG90aGVyOiBSZWFkb25seVNldExpa2U8YW55Pik6IGJvb2xlYW4ge1xuICAgICAgcmV0dXJuIFNldC5wcm90b3R5cGUuaXNEaXNqb2ludEZyb20uY2FsbChuZXcgU2V0KHRoaXMudmFsdWVzKCkpLCBvdGhlcik7XG4gICAgfSxcbiAgfSk7XG59XG5cbmV4cG9ydCBjb25zdCBzZXRIYW5kbGVyS2V5cyA9IFJlZmxlY3Qub3duS2V5cyhzZXRIYW5kbGVyKTtcbiIsICJpbXBvcnQge1xuICBEcmFmdFR5cGUsXG4gIEZpbmFsaXRpZXMsXG4gIFBhdGNoZXMsXG4gIFByb3h5RHJhZnQsXG4gIE9wdGlvbnMsXG4gIE9wZXJhdGlvbixcbn0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgZGF0YVR5cGVzLCBQUk9YWV9EUkFGVCB9IGZyb20gJy4vY29uc3RhbnQnO1xuaW1wb3J0IHsgbWFwSGFuZGxlciwgbWFwSGFuZGxlcktleXMgfSBmcm9tICcuL21hcCc7XG5pbXBvcnQgeyBzZXRIYW5kbGVyLCBzZXRIYW5kbGVyS2V5cyB9IGZyb20gJy4vc2V0JztcbmltcG9ydCB7IGludGVybmFsIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQge1xuICBkZWVwRnJlZXplLFxuICBlbnN1cmVTaGFsbG93Q29weSxcbiAgZ2V0RGVzY3JpcHRvcixcbiAgZ2V0UHJveHlEcmFmdCxcbiAgZ2V0VHlwZSxcbiAgZ2V0VmFsdWUsXG4gIGhhcyxcbiAgaXNFcXVhbCxcbiAgaXNEcmFmdGFibGUsXG4gIGxhdGVzdCxcbiAgbWFya0NoYW5nZWQsXG4gIHBlZWssXG4gIGdldCxcbiAgc2V0LFxuICByZXZva2VQcm94eSxcbiAgZmluYWxpemVTZXRWYWx1ZSxcbiAgbWFya0ZpbmFsaXphdGlvbixcbiAgZmluYWxpemVQYXRjaGVzLFxuICBpc0RyYWZ0LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGNoZWNrUmVhZGFibGUgfSBmcm9tICcuL3Vuc2FmZSc7XG5pbXBvcnQgeyBnZW5lcmF0ZVBhdGNoZXMgfSBmcm9tICcuL3BhdGNoJztcblxuY29uc3QgcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8UHJveHlEcmFmdD4gPSB7XG4gIGdldCh0YXJnZXQ6IFByb3h5RHJhZnQsIGtleTogc3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sLCByZWNlaXZlcjogYW55KSB7XG4gICAgY29uc3QgY29weSA9IHRhcmdldC5jb3B5Py5ba2V5XTtcbiAgICAvLyBJbXByb3ZlIGRyYWZ0IHJlYWRpbmcgcGVyZm9ybWFuY2UgYnkgY2FjaGluZyB0aGUgZHJhZnQgY29weS5cbiAgICBpZiAoY29weSAmJiB0YXJnZXQuZmluYWxpdGllcy5kcmFmdHNDYWNoZS5oYXMoY29weSkpIHtcbiAgICAgIHJldHVybiBjb3B5O1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSBQUk9YWV9EUkFGVCkgcmV0dXJuIHRhcmdldDtcbiAgICBsZXQgbWFya1Jlc3VsdDogYW55O1xuICAgIGlmICh0YXJnZXQub3B0aW9ucy5tYXJrKSB7XG4gICAgICAvLyBoYW5kbGUgYFVuY2F1Z2h0IFR5cGVFcnJvcjogTWV0aG9kIGdldCBNYXAucHJvdG90eXBlLnNpemUgY2FsbGVkIG9uIGluY29tcGF0aWJsZSByZWNlaXZlciAjPE1hcD5gXG4gICAgICAvLyBvciBgVW5jYXVnaHQgVHlwZUVycm9yOiBNZXRob2QgZ2V0IFNldC5wcm90b3R5cGUuc2l6ZSBjYWxsZWQgb24gaW5jb21wYXRpYmxlIHJlY2VpdmVyICM8U2V0PmBcbiAgICAgIGNvbnN0IHZhbHVlID1cbiAgICAgICAga2V5ID09PSAnc2l6ZScgJiZcbiAgICAgICAgKHRhcmdldC5vcmlnaW5hbCBpbnN0YW5jZW9mIE1hcCB8fCB0YXJnZXQub3JpZ2luYWwgaW5zdGFuY2VvZiBTZXQpXG4gICAgICAgICAgPyBSZWZsZWN0LmdldCh0YXJnZXQub3JpZ2luYWwsIGtleSlcbiAgICAgICAgICA6IFJlZmxlY3QuZ2V0KHRhcmdldC5vcmlnaW5hbCwga2V5LCByZWNlaXZlcik7XG4gICAgICBtYXJrUmVzdWx0ID0gdGFyZ2V0Lm9wdGlvbnMubWFyayh2YWx1ZSwgZGF0YVR5cGVzKTtcbiAgICAgIGlmIChtYXJrUmVzdWx0ID09PSBkYXRhVHlwZXMubXV0YWJsZSkge1xuICAgICAgICBpZiAodGFyZ2V0Lm9wdGlvbnMuc3RyaWN0KSB7XG4gICAgICAgICAgY2hlY2tSZWFkYWJsZSh2YWx1ZSwgdGFyZ2V0Lm9wdGlvbnMsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgc291cmNlID0gbGF0ZXN0KHRhcmdldCk7XG5cbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgTWFwICYmIG1hcEhhbmRsZXJLZXlzLmluY2x1ZGVzKGtleSBhcyBhbnkpKSB7XG4gICAgICBpZiAoa2V5ID09PSAnc2l6ZScpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobWFwSGFuZGxlciwgJ3NpemUnKSEuZ2V0IS5jYWxsKFxuICAgICAgICAgIHRhcmdldC5wcm94eVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgY29uc3QgaGFuZGxlID0gbWFwSGFuZGxlcltrZXkgYXMga2V5b2YgdHlwZW9mIG1hcEhhbmRsZXJdIGFzIEZ1bmN0aW9uO1xuICAgICAgcmV0dXJuIGhhbmRsZS5iaW5kKHRhcmdldC5wcm94eSk7XG4gICAgfVxuXG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFNldCAmJiBzZXRIYW5kbGVyS2V5cy5pbmNsdWRlcyhrZXkgYXMgYW55KSkge1xuICAgICAgaWYgKGtleSA9PT0gJ3NpemUnKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNldEhhbmRsZXIsICdzaXplJykhLmdldCEuY2FsbChcbiAgICAgICAgICB0YXJnZXQucHJveHlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGhhbmRsZSA9IHNldEhhbmRsZXJba2V5IGFzIGtleW9mIHR5cGVvZiBzZXRIYW5kbGVyXSBhcyBGdW5jdGlvbjtcbiAgICAgIHJldHVybiBoYW5kbGUuYmluZCh0YXJnZXQucHJveHkpO1xuICAgIH1cblxuICAgIGlmICghaGFzKHNvdXJjZSwga2V5KSkge1xuICAgICAgY29uc3QgZGVzYyA9IGdldERlc2NyaXB0b3Ioc291cmNlLCBrZXkpO1xuICAgICAgcmV0dXJuIGRlc2NcbiAgICAgICAgPyBgdmFsdWVgIGluIGRlc2NcbiAgICAgICAgICA/IGRlc2MudmFsdWVcbiAgICAgICAgICA6IC8vICFjYXNlOiBzdXBwb3J0IGZvciBnZXR0ZXJcbiAgICAgICAgICAgIGRlc2MuZ2V0Py5jYWxsKHRhcmdldC5wcm94eSlcbiAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHZhbHVlID0gc291cmNlW2tleV07XG4gICAgaWYgKHRhcmdldC5vcHRpb25zLnN0cmljdCkge1xuICAgICAgY2hlY2tSZWFkYWJsZSh2YWx1ZSwgdGFyZ2V0Lm9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAodGFyZ2V0LmZpbmFsaXplZCB8fCAhaXNEcmFmdGFibGUodmFsdWUsIHRhcmdldC5vcHRpb25zKSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICAvLyBFbnN1cmUgdGhhdCB0aGUgYXNzaWduZWQgdmFsdWVzIGFyZSBub3QgZHJhZnRlZFxuICAgIGlmICh2YWx1ZSA9PT0gcGVlayh0YXJnZXQub3JpZ2luYWwsIGtleSkpIHtcbiAgICAgIGVuc3VyZVNoYWxsb3dDb3B5KHRhcmdldCk7XG4gICAgICB0YXJnZXQuY29weSFba2V5XSA9IGNyZWF0ZURyYWZ0KHtcbiAgICAgICAgb3JpZ2luYWw6IHRhcmdldC5vcmlnaW5hbFtrZXldLFxuICAgICAgICBwYXJlbnREcmFmdDogdGFyZ2V0LFxuICAgICAgICBrZXk6IHRhcmdldC50eXBlID09PSBEcmFmdFR5cGUuQXJyYXkgPyBOdW1iZXIoa2V5KSA6IGtleSxcbiAgICAgICAgZmluYWxpdGllczogdGFyZ2V0LmZpbmFsaXRpZXMsXG4gICAgICAgIG9wdGlvbnM6IHRhcmdldC5vcHRpb25zLFxuICAgICAgfSk7XG4gICAgICAvLyAhY2FzZTogc3VwcG9ydCBmb3IgY3VzdG9tIHNoYWxsb3cgY29weSBmdW5jdGlvblxuICAgICAgaWYgKHR5cGVvZiBtYXJrUmVzdWx0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnN0IHN1YlByb3h5RHJhZnQgPSBnZXRQcm94eURyYWZ0KHRhcmdldC5jb3B5IVtrZXldKSE7XG4gICAgICAgIGVuc3VyZVNoYWxsb3dDb3B5KHN1YlByb3h5RHJhZnQpO1xuICAgICAgICAvLyBUcmlnZ2VyIGEgY3VzdG9tIHNoYWxsb3cgY29weSB0byB1cGRhdGUgdG8gYSBuZXcgY29weVxuICAgICAgICBtYXJrQ2hhbmdlZChzdWJQcm94eURyYWZ0KTtcbiAgICAgICAgcmV0dXJuIHN1YlByb3h5RHJhZnQuY29weTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0YXJnZXQuY29weSFba2V5XTtcbiAgICB9XG4gICAgaWYgKGlzRHJhZnQodmFsdWUpKSB7XG4gICAgICB0YXJnZXQuZmluYWxpdGllcy5kcmFmdHNDYWNoZS5hZGQodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH0sXG4gIHNldCh0YXJnZXQ6IFByb3h5RHJhZnQsIGtleTogc3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sLCB2YWx1ZTogYW55KSB7XG4gICAgaWYgKHRhcmdldC50eXBlID09PSBEcmFmdFR5cGUuU2V0IHx8IHRhcmdldC50eXBlID09PSBEcmFmdFR5cGUuTWFwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBNYXAvU2V0IGRyYWZ0IGRvZXMgbm90IHN1cHBvcnQgYW55IHByb3BlcnR5IGFzc2lnbm1lbnQuYFxuICAgICAgKTtcbiAgICB9XG4gICAgbGV0IF9rZXk6IG51bWJlcjtcbiAgICBpZiAoXG4gICAgICB0YXJnZXQudHlwZSA9PT0gRHJhZnRUeXBlLkFycmF5ICYmXG4gICAgICBrZXkgIT09ICdsZW5ndGgnICYmXG4gICAgICAhKFxuICAgICAgICBOdW1iZXIuaXNJbnRlZ2VyKChfa2V5ID0gTnVtYmVyKGtleSkpKSAmJlxuICAgICAgICBfa2V5ID49IDAgJiZcbiAgICAgICAgKGtleSA9PT0gMCB8fCBfa2V5ID09PSAwIHx8IFN0cmluZyhfa2V5KSA9PT0gU3RyaW5nKGtleSkpXG4gICAgICApXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBPbmx5IHN1cHBvcnRzIHNldHRpbmcgYXJyYXkgaW5kaWNlcyBhbmQgdGhlICdsZW5ndGgnIHByb3BlcnR5LmBcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGRlc2MgPSBnZXREZXNjcmlwdG9yKGxhdGVzdCh0YXJnZXQpLCBrZXkpO1xuICAgIGlmIChkZXNjPy5zZXQpIHtcbiAgICAgIC8vICFjYXNlOiBjb3ZlciB0aGUgY2FzZSBvZiBzZXR0ZXJcbiAgICAgIGRlc2Muc2V0LmNhbGwodGFyZ2V0LnByb3h5LCB2YWx1ZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgY3VycmVudCA9IHBlZWsobGF0ZXN0KHRhcmdldCksIGtleSk7XG4gICAgY29uc3QgY3VycmVudFByb3h5RHJhZnQgPSBnZXRQcm94eURyYWZ0KGN1cnJlbnQpO1xuICAgIGlmIChjdXJyZW50UHJveHlEcmFmdCAmJiBpc0VxdWFsKGN1cnJlbnRQcm94eURyYWZ0Lm9yaWdpbmFsLCB2YWx1ZSkpIHtcbiAgICAgIC8vICFjYXNlOiBpZ25vcmUgdGhlIGNhc2Ugb2YgYXNzaWduaW5nIHRoZSBvcmlnaW5hbCBkcmFmdGFibGUgdmFsdWUgdG8gYSBkcmFmdFxuICAgICAgdGFyZ2V0LmNvcHkhW2tleV0gPSB2YWx1ZTtcbiAgICAgIHRhcmdldC5hc3NpZ25lZE1hcCA9IHRhcmdldC5hc3NpZ25lZE1hcCA/PyBuZXcgTWFwKCk7XG4gICAgICB0YXJnZXQuYXNzaWduZWRNYXAuc2V0KGtleSwgZmFsc2UpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vICFjYXNlOiBoYW5kbGUgbmV3IHByb3BzIHdpdGggdmFsdWUgJ3VuZGVmaW5lZCdcbiAgICBpZiAoXG4gICAgICBpc0VxdWFsKHZhbHVlLCBjdXJyZW50KSAmJlxuICAgICAgKHZhbHVlICE9PSB1bmRlZmluZWQgfHwgaGFzKHRhcmdldC5vcmlnaW5hbCwga2V5KSlcbiAgICApXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBlbnN1cmVTaGFsbG93Q29weSh0YXJnZXQpO1xuICAgIG1hcmtDaGFuZ2VkKHRhcmdldCk7XG4gICAgaWYgKGhhcyh0YXJnZXQub3JpZ2luYWwsIGtleSkgJiYgaXNFcXVhbCh2YWx1ZSwgdGFyZ2V0Lm9yaWdpbmFsW2tleV0pKSB7XG4gICAgICAvLyAhY2FzZTogaGFuZGxlIHRoZSBjYXNlIG9mIGFzc2lnbmluZyB0aGUgb3JpZ2luYWwgbm9uLWRyYWZ0YWJsZSB2YWx1ZSB0byBhIGRyYWZ0XG4gICAgICB0YXJnZXQuYXNzaWduZWRNYXAhLmRlbGV0ZShrZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXQuYXNzaWduZWRNYXAhLnNldChrZXksIHRydWUpO1xuICAgIH1cbiAgICB0YXJnZXQuY29weSFba2V5XSA9IHZhbHVlO1xuICAgIG1hcmtGaW5hbGl6YXRpb24odGFyZ2V0LCBrZXksIHZhbHVlLCBnZW5lcmF0ZVBhdGNoZXMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBoYXModGFyZ2V0OiBQcm94eURyYWZ0LCBrZXk6IHN0cmluZyB8IHN5bWJvbCkge1xuICAgIHJldHVybiBrZXkgaW4gbGF0ZXN0KHRhcmdldCk7XG4gIH0sXG4gIG93bktleXModGFyZ2V0OiBQcm94eURyYWZ0KSB7XG4gICAgcmV0dXJuIFJlZmxlY3Qub3duS2V5cyhsYXRlc3QodGFyZ2V0KSk7XG4gIH0sXG4gIGdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQ6IFByb3h5RHJhZnQsIGtleTogc3RyaW5nIHwgc3ltYm9sKSB7XG4gICAgY29uc3Qgc291cmNlID0gbGF0ZXN0KHRhcmdldCk7XG4gICAgY29uc3QgZGVzY3JpcHRvciA9IFJlZmxlY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNvdXJjZSwga2V5KTtcbiAgICBpZiAoIWRlc2NyaXB0b3IpIHJldHVybiBkZXNjcmlwdG9yO1xuICAgIHJldHVybiB7XG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdGFyZ2V0LnR5cGUgIT09IERyYWZ0VHlwZS5BcnJheSB8fCBrZXkgIT09ICdsZW5ndGgnLFxuICAgICAgZW51bWVyYWJsZTogZGVzY3JpcHRvci5lbnVtZXJhYmxlLFxuICAgICAgdmFsdWU6IHNvdXJjZVtrZXldLFxuICAgIH07XG4gIH0sXG4gIGdldFByb3RvdHlwZU9mKHRhcmdldDogUHJveHlEcmFmdCkge1xuICAgIHJldHVybiBSZWZsZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldC5vcmlnaW5hbCk7XG4gIH0sXG4gIHNldFByb3RvdHlwZU9mKCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGNhbGwgJ3NldFByb3RvdHlwZU9mKCknIG9uIGRyYWZ0c2ApO1xuICB9LFxuICBkZWZpbmVQcm9wZXJ0eSgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBjYWxsICdkZWZpbmVQcm9wZXJ0eSgpJyBvbiBkcmFmdHNgKTtcbiAgfSxcbiAgZGVsZXRlUHJvcGVydHkodGFyZ2V0OiBQcm94eURyYWZ0LCBrZXk6IHN0cmluZyB8IHN5bWJvbCkge1xuICAgIGlmICh0YXJnZXQudHlwZSA9PT0gRHJhZnRUeXBlLkFycmF5KSB7XG4gICAgICByZXR1cm4gcHJveHlIYW5kbGVyLnNldCEuY2FsbCh0aGlzLCB0YXJnZXQsIGtleSwgdW5kZWZpbmVkLCB0YXJnZXQucHJveHkpO1xuICAgIH1cbiAgICBpZiAocGVlayh0YXJnZXQub3JpZ2luYWwsIGtleSkgIT09IHVuZGVmaW5lZCB8fCBrZXkgaW4gdGFyZ2V0Lm9yaWdpbmFsKSB7XG4gICAgICAvLyAhY2FzZTogZGVsZXRlIGFuIGV4aXN0aW5nIGtleVxuICAgICAgZW5zdXJlU2hhbGxvd0NvcHkodGFyZ2V0KTtcbiAgICAgIG1hcmtDaGFuZ2VkKHRhcmdldCk7XG4gICAgICB0YXJnZXQuYXNzaWduZWRNYXAhLnNldChrZXksIGZhbHNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0LmFzc2lnbmVkTWFwID0gdGFyZ2V0LmFzc2lnbmVkTWFwID8/IG5ldyBNYXAoKTtcbiAgICAgIC8vIFRoZSBvcmlnaW5hbCBub24tZXhpc3RlbnQga2V5IGhhcyBiZWVuIGRlbGV0ZWRcbiAgICAgIHRhcmdldC5hc3NpZ25lZE1hcC5kZWxldGUoa2V5KTtcbiAgICB9XG4gICAgaWYgKHRhcmdldC5jb3B5KSBkZWxldGUgdGFyZ2V0LmNvcHlba2V5XTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEcmFmdDxUIGV4dGVuZHMgb2JqZWN0PihjcmVhdGVEcmFmdE9wdGlvbnM6IHtcbiAgb3JpZ2luYWw6IFQ7XG4gIHBhcmVudERyYWZ0PzogUHJveHlEcmFmdCB8IG51bGw7XG4gIGtleT86IHN0cmluZyB8IG51bWJlciB8IHN5bWJvbDtcbiAgZmluYWxpdGllczogRmluYWxpdGllcztcbiAgb3B0aW9uczogT3B0aW9uczxhbnksIGFueT47XG59KTogVCB7XG4gIGNvbnN0IHsgb3JpZ2luYWwsIHBhcmVudERyYWZ0LCBrZXksIGZpbmFsaXRpZXMsIG9wdGlvbnMgfSA9XG4gICAgY3JlYXRlRHJhZnRPcHRpb25zO1xuICBjb25zdCB0eXBlID0gZ2V0VHlwZShvcmlnaW5hbCk7XG4gIGNvbnN0IHByb3h5RHJhZnQ6IFByb3h5RHJhZnQgPSB7XG4gICAgdHlwZSxcbiAgICBmaW5hbGl6ZWQ6IGZhbHNlLFxuICAgIHBhcmVudDogcGFyZW50RHJhZnQsXG4gICAgb3JpZ2luYWwsXG4gICAgY29weTogbnVsbCxcbiAgICBwcm94eTogbnVsbCxcbiAgICBmaW5hbGl0aWVzLFxuICAgIG9wdGlvbnMsXG4gICAgLy8gTWFwcGluZyBvZiBkcmFmdCBTZXQgaXRlbXMgdG8gdGhlaXIgY29ycmVzcG9uZGluZyBkcmFmdCB2YWx1ZXMuXG4gICAgc2V0TWFwOlxuICAgICAgdHlwZSA9PT0gRHJhZnRUeXBlLlNldFxuICAgICAgICA/IG5ldyBNYXAoKG9yaWdpbmFsIGFzIFNldDxhbnk+KS5lbnRyaWVzKCkpXG4gICAgICAgIDogdW5kZWZpbmVkLFxuICB9O1xuICAvLyAhY2FzZTogdW5kZWZpbmVkIGFzIGEgZHJhZnQgbWFwIGtleVxuICBpZiAoa2V5IHx8ICdrZXknIGluIGNyZWF0ZURyYWZ0T3B0aW9ucykge1xuICAgIHByb3h5RHJhZnQua2V5ID0ga2V5O1xuICB9XG4gIGNvbnN0IHsgcHJveHksIHJldm9rZSB9ID0gUHJveHkucmV2b2NhYmxlPGFueT4oXG4gICAgdHlwZSA9PT0gRHJhZnRUeXBlLkFycmF5ID8gT2JqZWN0LmFzc2lnbihbXSwgcHJveHlEcmFmdCkgOiBwcm94eURyYWZ0LFxuICAgIHByb3h5SGFuZGxlclxuICApO1xuICBmaW5hbGl0aWVzLnJldm9rZS5wdXNoKHJldm9rZSk7XG4gIHByb3h5RHJhZnQucHJveHkgPSBwcm94eTtcbiAgaWYgKHBhcmVudERyYWZ0KSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gcGFyZW50RHJhZnQ7XG4gICAgdGFyZ2V0LmZpbmFsaXRpZXMuZHJhZnQucHVzaCgocGF0Y2hlcywgaW52ZXJzZVBhdGNoZXMpID0+IHtcbiAgICAgIGNvbnN0IG9sZFByb3h5RHJhZnQgPSBnZXRQcm94eURyYWZ0KHByb3h5KSE7XG4gICAgICAvLyBpZiB0YXJnZXQgaXMgYSBTZXQgZHJhZnQsIGBzZXRNYXBgIGlzIHRoZSByZWFsIFNldCBjb3BpZXMgcHJveHkgbWFwcGluZy5cbiAgICAgIGxldCBjb3B5ID0gdGFyZ2V0LnR5cGUgPT09IERyYWZ0VHlwZS5TZXQgPyB0YXJnZXQuc2V0TWFwIDogdGFyZ2V0LmNvcHk7XG4gICAgICBjb25zdCBkcmFmdCA9IGdldChjb3B5LCBrZXkhKTtcbiAgICAgIGNvbnN0IHByb3h5RHJhZnQgPSBnZXRQcm94eURyYWZ0KGRyYWZ0KTtcbiAgICAgIGlmIChwcm94eURyYWZ0KSB7XG4gICAgICAgIC8vIGFzc2lnbiB0aGUgdXBkYXRlZCB2YWx1ZSB0byB0aGUgY29weSBvYmplY3RcbiAgICAgICAgbGV0IHVwZGF0ZWRWYWx1ZSA9IHByb3h5RHJhZnQub3JpZ2luYWw7XG4gICAgICAgIGlmIChwcm94eURyYWZ0Lm9wZXJhdGVkKSB7XG4gICAgICAgICAgdXBkYXRlZFZhbHVlID0gZ2V0VmFsdWUoZHJhZnQpO1xuICAgICAgICB9XG4gICAgICAgIGZpbmFsaXplU2V0VmFsdWUocHJveHlEcmFmdCk7XG4gICAgICAgIGZpbmFsaXplUGF0Y2hlcyhwcm94eURyYWZ0LCBnZW5lcmF0ZVBhdGNoZXMsIHBhdGNoZXMsIGludmVyc2VQYXRjaGVzKTtcbiAgICAgICAgaWYgKF9fREVWX18gJiYgdGFyZ2V0Lm9wdGlvbnMuZW5hYmxlQXV0b0ZyZWV6ZSkge1xuICAgICAgICAgIHRhcmdldC5vcHRpb25zLnVwZGF0ZWRWYWx1ZXMgPVxuICAgICAgICAgICAgdGFyZ2V0Lm9wdGlvbnMudXBkYXRlZFZhbHVlcyA/PyBuZXcgV2Vha01hcCgpO1xuICAgICAgICAgIHRhcmdldC5vcHRpb25zLnVwZGF0ZWRWYWx1ZXMuc2V0KHVwZGF0ZWRWYWx1ZSwgcHJveHlEcmFmdC5vcmlnaW5hbCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZmluYWwgdXBkYXRlIHZhbHVlXG4gICAgICAgIHNldChjb3B5LCBrZXkhLCB1cGRhdGVkVmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gIWNhc2U6IGhhbmRsZSB0aGUgZGVsZXRlZCBrZXlcbiAgICAgIG9sZFByb3h5RHJhZnQuY2FsbGJhY2tzPy5mb3JFYWNoKChjYWxsYmFjaykgPT4ge1xuICAgICAgICBjYWxsYmFjayhwYXRjaGVzLCBpbnZlcnNlUGF0Y2hlcyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICAvLyAhY2FzZTogaGFuZGxlIHRoZSByb290IGRyYWZ0XG4gICAgY29uc3QgdGFyZ2V0ID0gZ2V0UHJveHlEcmFmdChwcm94eSkhO1xuICAgIHRhcmdldC5maW5hbGl0aWVzLmRyYWZ0LnB1c2goKHBhdGNoZXMsIGludmVyc2VQYXRjaGVzKSA9PiB7XG4gICAgICBmaW5hbGl6ZVNldFZhbHVlKHRhcmdldCk7XG4gICAgICBmaW5hbGl6ZVBhdGNoZXModGFyZ2V0LCBnZW5lcmF0ZVBhdGNoZXMsIHBhdGNoZXMsIGludmVyc2VQYXRjaGVzKTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gcHJveHk7XG59XG5cbmludGVybmFsLmNyZWF0ZURyYWZ0ID0gY3JlYXRlRHJhZnQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5hbGl6ZURyYWZ0PFQ+KFxuICByZXN1bHQ6IFQsXG4gIHJldHVybmVkVmFsdWU6IFtUXSB8IFtdLFxuICBwYXRjaGVzPzogUGF0Y2hlcyxcbiAgaW52ZXJzZVBhdGNoZXM/OiBQYXRjaGVzLFxuICBlbmFibGVBdXRvRnJlZXplPzogYm9vbGVhblxuKSB7XG4gIGNvbnN0IHByb3h5RHJhZnQgPSBnZXRQcm94eURyYWZ0KHJlc3VsdCk7XG4gIGNvbnN0IG9yaWdpbmFsID0gcHJveHlEcmFmdD8ub3JpZ2luYWwgPz8gcmVzdWx0O1xuICBjb25zdCBoYXNSZXR1cm5lZFZhbHVlID0gISFyZXR1cm5lZFZhbHVlLmxlbmd0aDtcbiAgaWYgKHByb3h5RHJhZnQ/Lm9wZXJhdGVkKSB7XG4gICAgd2hpbGUgKHByb3h5RHJhZnQuZmluYWxpdGllcy5kcmFmdC5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBmaW5hbGl6ZSA9IHByb3h5RHJhZnQuZmluYWxpdGllcy5kcmFmdC5wb3AoKSE7XG4gICAgICBmaW5hbGl6ZShwYXRjaGVzLCBpbnZlcnNlUGF0Y2hlcyk7XG4gICAgfVxuICB9XG4gIGNvbnN0IHN0YXRlID0gaGFzUmV0dXJuZWRWYWx1ZVxuICAgID8gcmV0dXJuZWRWYWx1ZVswXVxuICAgIDogcHJveHlEcmFmdFxuICAgICAgPyBwcm94eURyYWZ0Lm9wZXJhdGVkXG4gICAgICAgID8gcHJveHlEcmFmdC5jb3B5XG4gICAgICAgIDogcHJveHlEcmFmdC5vcmlnaW5hbFxuICAgICAgOiByZXN1bHQ7XG4gIGlmIChwcm94eURyYWZ0KSByZXZva2VQcm94eShwcm94eURyYWZ0KTtcbiAgaWYgKGVuYWJsZUF1dG9GcmVlemUpIHtcbiAgICBkZWVwRnJlZXplKHN0YXRlLCBzdGF0ZSwgcHJveHlEcmFmdD8ub3B0aW9ucy51cGRhdGVkVmFsdWVzKTtcbiAgfVxuICByZXR1cm4gW1xuICAgIHN0YXRlLFxuICAgIHBhdGNoZXMgJiYgaGFzUmV0dXJuZWRWYWx1ZVxuICAgICAgPyBbeyBvcDogT3BlcmF0aW9uLlJlcGxhY2UsIHBhdGg6IFtdLCB2YWx1ZTogcmV0dXJuZWRWYWx1ZVswXSB9XVxuICAgICAgOiBwYXRjaGVzLFxuICAgIGludmVyc2VQYXRjaGVzICYmIGhhc1JldHVybmVkVmFsdWVcbiAgICAgID8gW3sgb3A6IE9wZXJhdGlvbi5SZXBsYWNlLCBwYXRoOiBbXSwgdmFsdWU6IG9yaWdpbmFsIH1dXG4gICAgICA6IGludmVyc2VQYXRjaGVzLFxuICBdIGFzIFtULCBQYXRjaGVzIHwgdW5kZWZpbmVkLCBQYXRjaGVzIHwgdW5kZWZpbmVkXTtcbn1cbiIsICJpbXBvcnQge1xuICBGaW5hbGl0aWVzLFxuICBPcHRpb25zLFxuICBQYXRjaGVzLFxuICBQYXRjaGVzT3B0aW9ucyxcbiAgUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBjcmVhdGVEcmFmdCwgZmluYWxpemVEcmFmdCB9IGZyb20gJy4vZHJhZnQnO1xuaW1wb3J0IHsgaXNEcmFmdGFibGUgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGRhdGFUeXBlcyB9IGZyb20gJy4vY29uc3RhbnQnO1xuXG5leHBvcnQgZnVuY3Rpb24gZHJhZnRpZnk8XG4gIFQgZXh0ZW5kcyBvYmplY3QsXG4gIE8gZXh0ZW5kcyBQYXRjaGVzT3B0aW9ucyA9IGZhbHNlLFxuICBGIGV4dGVuZHMgYm9vbGVhbiA9IGZhbHNlLFxuPihcbiAgYmFzZVN0YXRlOiBULFxuICBvcHRpb25zOiBPcHRpb25zPE8sIEY+XG4pOiBbVCwgKHJldHVybmVkVmFsdWU6IFtUXSB8IFtdKSA9PiBSZXN1bHQ8VCwgTywgRj5dIHtcbiAgY29uc3QgZmluYWxpdGllczogRmluYWxpdGllcyA9IHtcbiAgICBkcmFmdDogW10sXG4gICAgcmV2b2tlOiBbXSxcbiAgICBoYW5kbGVkU2V0OiBuZXcgV2Vha1NldDxhbnk+KCksXG4gICAgZHJhZnRzQ2FjaGU6IG5ldyBXZWFrU2V0PG9iamVjdD4oKSxcbiAgfTtcbiAgbGV0IHBhdGNoZXM6IFBhdGNoZXMgfCB1bmRlZmluZWQ7XG4gIGxldCBpbnZlcnNlUGF0Y2hlczogUGF0Y2hlcyB8IHVuZGVmaW5lZDtcbiAgaWYgKG9wdGlvbnMuZW5hYmxlUGF0Y2hlcykge1xuICAgIHBhdGNoZXMgPSBbXTtcbiAgICBpbnZlcnNlUGF0Y2hlcyA9IFtdO1xuICB9XG4gIGNvbnN0IGlzTXV0YWJsZSA9XG4gICAgb3B0aW9ucy5tYXJrPy4oYmFzZVN0YXRlLCBkYXRhVHlwZXMpID09PSBkYXRhVHlwZXMubXV0YWJsZSB8fFxuICAgICFpc0RyYWZ0YWJsZShiYXNlU3RhdGUsIG9wdGlvbnMpO1xuICBjb25zdCBkcmFmdCA9IGlzTXV0YWJsZVxuICAgID8gYmFzZVN0YXRlXG4gICAgOiBjcmVhdGVEcmFmdCh7XG4gICAgICAgIG9yaWdpbmFsOiBiYXNlU3RhdGUsXG4gICAgICAgIHBhcmVudERyYWZ0OiBudWxsLFxuICAgICAgICBmaW5hbGl0aWVzLFxuICAgICAgICBvcHRpb25zLFxuICAgICAgfSk7XG4gIHJldHVybiBbXG4gICAgZHJhZnQsXG4gICAgKHJldHVybmVkVmFsdWU6IFtUXSB8IFtdID0gW10pID0+IHtcbiAgICAgIGNvbnN0IFtmaW5hbGl6ZWRTdGF0ZSwgZmluYWxpemVkUGF0Y2hlcywgZmluYWxpemVkSW52ZXJzZVBhdGNoZXNdID1cbiAgICAgICAgZmluYWxpemVEcmFmdChcbiAgICAgICAgICBkcmFmdCxcbiAgICAgICAgICByZXR1cm5lZFZhbHVlLFxuICAgICAgICAgIHBhdGNoZXMsXG4gICAgICAgICAgaW52ZXJzZVBhdGNoZXMsXG4gICAgICAgICAgb3B0aW9ucy5lbmFibGVBdXRvRnJlZXplXG4gICAgICAgICk7XG4gICAgICByZXR1cm4gKFxuICAgICAgICBvcHRpb25zLmVuYWJsZVBhdGNoZXNcbiAgICAgICAgICA/IFtmaW5hbGl6ZWRTdGF0ZSwgZmluYWxpemVkUGF0Y2hlcywgZmluYWxpemVkSW52ZXJzZVBhdGNoZXNdXG4gICAgICAgICAgOiBmaW5hbGl6ZWRTdGF0ZVxuICAgICAgKSBhcyBSZXN1bHQ8VCwgTywgRj47XG4gICAgfSxcbiAgXTtcbn1cbiIsICJpbXBvcnQgeyB0eXBlIERyYWZ0LCBEcmFmdFR5cGUsIHR5cGUgUHJveHlEcmFmdCB9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7XG4gIGZvckVhY2gsXG4gIGdldCxcbiAgZ2V0UHJveHlEcmFmdCxcbiAgZ2V0VHlwZSxcbiAgaXNCYXNlTWFwSW5zdGFuY2UsXG4gIGlzQmFzZVNldEluc3RhbmNlLFxuICBpc0RyYWZ0LFxuICBpc0RyYWZ0YWJsZSxcbiAgaXNFcXVhbCxcbiAgc2V0LFxuICBzaGFsbG93Q29weSxcbn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBoYW5kbGVSZXR1cm5WYWx1ZTxUIGV4dGVuZHMgb2JqZWN0PihvcHRpb25zOiB7XG4gIHJvb3REcmFmdDogUHJveHlEcmFmdDxhbnk+IHwgdW5kZWZpbmVkO1xuICB2YWx1ZTogVDtcbiAgdXNlUmF3UmV0dXJuPzogYm9vbGVhbjtcbiAgaXNDb250YWluRHJhZnQ/OiBib29sZWFuO1xuICBpc1Jvb3Q/OiBib29sZWFuO1xufSkge1xuICBjb25zdCB7IHJvb3REcmFmdCwgdmFsdWUsIHVzZVJhd1JldHVybiA9IGZhbHNlLCBpc1Jvb3QgPSB0cnVlIH0gPSBvcHRpb25zO1xuICBmb3JFYWNoKHZhbHVlLCAoa2V5LCBpdGVtLCBzb3VyY2UpID0+IHtcbiAgICBjb25zdCBwcm94eURyYWZ0ID0gZ2V0UHJveHlEcmFmdChpdGVtKTtcbiAgICAvLyBqdXN0IGhhbmRsZSB0aGUgZHJhZnQgd2hpY2ggaXMgY3JlYXRlZCBieSB0aGUgc2FtZSByb290RHJhZnRcbiAgICBpZiAoXG4gICAgICBwcm94eURyYWZ0ICYmXG4gICAgICByb290RHJhZnQgJiZcbiAgICAgIHByb3h5RHJhZnQuZmluYWxpdGllcyA9PT0gcm9vdERyYWZ0LmZpbmFsaXRpZXNcbiAgICApIHtcbiAgICAgIG9wdGlvbnMuaXNDb250YWluRHJhZnQgPSB0cnVlO1xuICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gcHJveHlEcmFmdC5vcmlnaW5hbDtcbiAgICAgIC8vIGZpbmFsIHVwZGF0ZSB2YWx1ZSwgYnV0IGp1c3QgaGFuZGxlIHJldHVybiB2YWx1ZVxuICAgICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICBjb25zdCBhcnIgPSBBcnJheS5mcm9tKHNvdXJjZSk7XG4gICAgICAgIHNvdXJjZS5jbGVhcigpO1xuICAgICAgICBhcnIuZm9yRWFjaCgoX2l0ZW0pID0+XG4gICAgICAgICAgc291cmNlLmFkZChrZXkgPT09IF9pdGVtID8gY3VycmVudFZhbHVlIDogX2l0ZW0pXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXQoc291cmNlLCBrZXksIGN1cnJlbnRWYWx1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgaXRlbSAhPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucy52YWx1ZSA9IGl0ZW07XG4gICAgICBvcHRpb25zLmlzUm9vdCA9IGZhbHNlO1xuICAgICAgaGFuZGxlUmV0dXJuVmFsdWUob3B0aW9ucyk7XG4gICAgfVxuICB9KTtcbiAgaWYgKF9fREVWX18gJiYgaXNSb290KSB7XG4gICAgaWYgKCFvcHRpb25zLmlzQ29udGFpbkRyYWZ0KVxuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICBgVGhlIHJldHVybiB2YWx1ZSBkb2VzIG5vdCBjb250YWluIGFueSBkcmFmdCwgcGxlYXNlIHVzZSAncmF3UmV0dXJuKCknIHRvIHdyYXAgdGhlIHJldHVybiB2YWx1ZSB0byBpbXByb3ZlIHBlcmZvcm1hbmNlLmBcbiAgICAgICk7XG5cbiAgICBpZiAodXNlUmF3UmV0dXJuKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBUaGUgcmV0dXJuIHZhbHVlIGNvbnRhaW5zIGRyYWZ0cywgcGxlYXNlIGRvbid0IHVzZSAncmF3UmV0dXJuKCknIHRvIHdyYXAgdGhlIHJldHVybiB2YWx1ZS5gXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRDdXJyZW50KHRhcmdldDogYW55KSB7XG4gIGNvbnN0IHByb3h5RHJhZnQgPSBnZXRQcm94eURyYWZ0KHRhcmdldCk7XG4gIGlmICghaXNEcmFmdGFibGUodGFyZ2V0LCBwcm94eURyYWZ0Py5vcHRpb25zKSkgcmV0dXJuIHRhcmdldDtcbiAgY29uc3QgdHlwZSA9IGdldFR5cGUodGFyZ2V0KTtcbiAgaWYgKHByb3h5RHJhZnQgJiYgIXByb3h5RHJhZnQub3BlcmF0ZWQpIHJldHVybiBwcm94eURyYWZ0Lm9yaWdpbmFsO1xuICBsZXQgY3VycmVudFZhbHVlOiBhbnk7XG4gIGZ1bmN0aW9uIGVuc3VyZVNoYWxsb3dDb3B5KCkge1xuICAgIGN1cnJlbnRWYWx1ZSA9XG4gICAgICB0eXBlID09PSBEcmFmdFR5cGUuTWFwXG4gICAgICAgID8gIWlzQmFzZU1hcEluc3RhbmNlKHRhcmdldClcbiAgICAgICAgICA/IG5ldyAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCkuY29uc3RydWN0b3IpKHRhcmdldClcbiAgICAgICAgICA6IG5ldyBNYXAodGFyZ2V0KVxuICAgICAgICA6IHR5cGUgPT09IERyYWZ0VHlwZS5TZXRcbiAgICAgICAgICA/IEFycmF5LmZyb20ocHJveHlEcmFmdCEuc2V0TWFwIS52YWx1ZXMoKSEpXG4gICAgICAgICAgOiBzaGFsbG93Q29weSh0YXJnZXQsIHByb3h5RHJhZnQ/Lm9wdGlvbnMpO1xuICB9XG5cbiAgaWYgKHByb3h5RHJhZnQpIHtcbiAgICAvLyBJdCdzIGEgcHJveHkgZHJhZnQsIGxldCdzIGNyZWF0ZSBhIHNoYWxsb3cgY29weSBlYWdlcmx5XG4gICAgcHJveHlEcmFmdC5maW5hbGl6ZWQgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBlbnN1cmVTaGFsbG93Q29weSgpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBwcm94eURyYWZ0LmZpbmFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBJdCdzIG5vdCBhIHByb3h5IGRyYWZ0LCBsZXQncyB1c2UgdGhlIHRhcmdldCBkaXJlY3RseSBhbmQgbGV0J3Mgc2VlXG4gICAgLy8gbGF6aWx5IGlmIHdlIG5lZWQgdG8gY3JlYXRlIGEgc2hhbGxvdyBjb3B5XG4gICAgY3VycmVudFZhbHVlID0gdGFyZ2V0O1xuICB9XG5cbiAgZm9yRWFjaChjdXJyZW50VmFsdWUsIChrZXksIHZhbHVlKSA9PiB7XG4gICAgaWYgKHByb3h5RHJhZnQgJiYgaXNFcXVhbChnZXQocHJveHlEcmFmdC5vcmlnaW5hbCwga2V5KSwgdmFsdWUpKSByZXR1cm47XG4gICAgY29uc3QgbmV3VmFsdWUgPSBnZXRDdXJyZW50KHZhbHVlKTtcbiAgICBpZiAobmV3VmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICBpZiAoY3VycmVudFZhbHVlID09PSB0YXJnZXQpIGVuc3VyZVNoYWxsb3dDb3B5KCk7XG4gICAgICBzZXQoY3VycmVudFZhbHVlLCBrZXksIG5ld1ZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICBpZiAodHlwZSA9PT0gRHJhZnRUeXBlLlNldCkge1xuICAgIGNvbnN0IHZhbHVlID0gcHJveHlEcmFmdD8ub3JpZ2luYWwgPz8gY3VycmVudFZhbHVlO1xuICAgIHJldHVybiAhaXNCYXNlU2V0SW5zdGFuY2UodmFsdWUpXG4gICAgICA/IG5ldyAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKS5jb25zdHJ1Y3RvcikoY3VycmVudFZhbHVlKVxuICAgICAgOiBuZXcgU2V0KGN1cnJlbnRWYWx1ZSk7XG4gIH1cbiAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbn1cblxuLyoqXG4gKiBgY3VycmVudChkcmFmdClgIHRvIGdldCBjdXJyZW50IHN0YXRlIGluIHRoZSBkcmFmdCBtdXRhdGlvbiBmdW5jdGlvbi5cbiAqXG4gKiAjIyBFeGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGNyZWF0ZSwgY3VycmVudCB9IGZyb20gJy4uL2luZGV4JztcbiAqXG4gKiBjb25zdCBiYXNlU3RhdGUgPSB7IGZvbzogeyBiYXI6ICdzdHInIH0sIGFycjogW10gfTtcbiAqIGNvbnN0IHN0YXRlID0gY3JlYXRlKFxuICogICBiYXNlU3RhdGUsXG4gKiAgIChkcmFmdCkgPT4ge1xuICogICAgIGRyYWZ0LmZvby5iYXIgPSAnc3RyMic7XG4gKiAgICAgZXhwZWN0KGN1cnJlbnQoZHJhZnQuZm9vKSkudG9FcXVhbCh7IGJhcjogJ3N0cjInIH0pO1xuICogICB9LFxuICogKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudDxUIGV4dGVuZHMgb2JqZWN0Pih0YXJnZXQ6IERyYWZ0PFQ+KTogVDtcbi8qKiBAZGVwcmVjYXRlZCBZb3Ugc2hvdWxkIGNhbGwgY3VycmVudCBvbmx5IG9uIGBEcmFmdDxUPmAgdHlwZXMuICovXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudDxUIGV4dGVuZHMgb2JqZWN0Pih0YXJnZXQ6IFQpOiBUO1xuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnQ8VCBleHRlbmRzIG9iamVjdD4odGFyZ2V0OiBUIHwgRHJhZnQ8VD4pOiBUIHtcbiAgaWYgKCFpc0RyYWZ0KHRhcmdldCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGN1cnJlbnQoKSBpcyBvbmx5IHVzZWQgZm9yIERyYWZ0LCBwYXJhbWV0ZXI6ICR7dGFyZ2V0fWApO1xuICB9XG4gIHJldHVybiBnZXRDdXJyZW50KHRhcmdldCk7XG59XG4iLCAiaW1wb3J0IHtcbiAgQ3JlYXRlUmVzdWx0LFxuICBEcmFmdCxcbiAgTWFyayxcbiAgT3B0aW9ucyxcbiAgRXh0ZXJuYWxPcHRpb25zLFxuICBQYXRjaGVzT3B0aW9ucyxcbiAgUmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBkcmFmdGlmeSB9IGZyb20gJy4vZHJhZnRpZnknO1xuaW1wb3J0IHtcbiAgZ2V0UHJveHlEcmFmdCxcbiAgaXNEcmFmdCxcbiAgaXNEcmFmdGFibGUsXG4gIGlzRXF1YWwsXG4gIHJldm9rZVByb3h5LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGN1cnJlbnQsIGhhbmRsZVJldHVyblZhbHVlIH0gZnJvbSAnLi9jdXJyZW50JztcbmltcG9ydCB7IFJBV19SRVRVUk5fU1lNQk9MLCBkYXRhVHlwZXMgfSBmcm9tICcuL2NvbnN0YW50JztcblxudHlwZSBNYWtlQ3JlYXRvciA9IDxcbiAgX0YgZXh0ZW5kcyBib29sZWFuID0gZmFsc2UsXG4gIF9PIGV4dGVuZHMgUGF0Y2hlc09wdGlvbnMgPSBmYWxzZSxcbj4oXG4gIG9wdGlvbnM/OiBFeHRlcm5hbE9wdGlvbnM8X08sIF9GPlxuKSA9PiB7XG4gIDxcbiAgICBUIGV4dGVuZHMgYW55LFxuICAgIEYgZXh0ZW5kcyBib29sZWFuID0gX0YsXG4gICAgTyBleHRlbmRzIFBhdGNoZXNPcHRpb25zID0gX08sXG4gICAgUiBleHRlbmRzIHZvaWQgfCBQcm9taXNlPHZvaWQ+IHwgVCB8IFByb21pc2U8VD4gPSB2b2lkLFxuICA+KFxuICAgIGJhc2U6IFQsXG4gICAgbXV0YXRlOiAoZHJhZnQ6IERyYWZ0PFQ+KSA9PiBSLFxuICAgIG9wdGlvbnM/OiBFeHRlcm5hbE9wdGlvbnM8TywgRj5cbiAgKTogQ3JlYXRlUmVzdWx0PFQsIE8sIEYsIFI+O1xuICA8XG4gICAgVCBleHRlbmRzIGFueSxcbiAgICBGIGV4dGVuZHMgYm9vbGVhbiA9IF9GLFxuICAgIE8gZXh0ZW5kcyBQYXRjaGVzT3B0aW9ucyA9IF9PLFxuICAgIFIgZXh0ZW5kcyB2b2lkIHwgUHJvbWlzZTx2b2lkPiA9IHZvaWQsXG4gID4oXG4gICAgYmFzZTogVCxcbiAgICBtdXRhdGU6IChkcmFmdDogVCkgPT4gUixcbiAgICBvcHRpb25zPzogRXh0ZXJuYWxPcHRpb25zPE8sIEY+XG4gICk6IENyZWF0ZVJlc3VsdDxULCBPLCBGLCBSPjtcbiAgPFxuICAgIFQgZXh0ZW5kcyBhbnksXG4gICAgUCBleHRlbmRzIGFueVtdID0gW10sXG4gICAgRiBleHRlbmRzIGJvb2xlYW4gPSBfRixcbiAgICBPIGV4dGVuZHMgUGF0Y2hlc09wdGlvbnMgPSBfTyxcbiAgICBSIGV4dGVuZHMgdm9pZCB8IFByb21pc2U8dm9pZD4gPSB2b2lkLFxuICA+KFxuICAgIG11dGF0ZTogKGRyYWZ0OiBEcmFmdDxUPiwgLi4uYXJnczogUCkgPT4gUixcbiAgICBvcHRpb25zPzogRXh0ZXJuYWxPcHRpb25zPE8sIEY+XG4gICk6IChiYXNlOiBULCAuLi5hcmdzOiBQKSA9PiBDcmVhdGVSZXN1bHQ8VCwgTywgRiwgUj47XG4gIDxUIGV4dGVuZHMgYW55LCBPIGV4dGVuZHMgUGF0Y2hlc09wdGlvbnMgPSBfTywgRiBleHRlbmRzIGJvb2xlYW4gPSBfRj4oXG4gICAgYmFzZTogVCxcbiAgICBvcHRpb25zPzogRXh0ZXJuYWxPcHRpb25zPE8sIEY+XG4gICk6IFtEcmFmdDxUPiwgKCkgPT4gUmVzdWx0PFQsIE8sIEY+XTtcbn07XG5cbi8qKlxuICogYG1ha2VDcmVhdG9yKG9wdGlvbnMpYCB0byBtYWtlIGEgY3JlYXRvciBmdW5jdGlvbi5cbiAqXG4gKiAjIyBFeGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IG1ha2VDcmVhdG9yIH0gZnJvbSAnLi4vaW5kZXgnO1xuICpcbiAqIGNvbnN0IGJhc2VTdGF0ZSA9IHsgZm9vOiB7IGJhcjogJ3N0cicgfSwgYXJyOiBbXSB9O1xuICogY29uc3QgY3JlYXRlID0gbWFrZUNyZWF0b3IoeyBlbmFibGVBdXRvRnJlZXplOiB0cnVlIH0pO1xuICogY29uc3Qgc3RhdGUgPSBjcmVhdGUoXG4gKiAgIGJhc2VTdGF0ZSxcbiAqICAgKGRyYWZ0KSA9PiB7XG4gKiAgICAgZHJhZnQuZm9vLmJhciA9ICdzdHIyJztcbiAqICAgfSxcbiAqICk7XG4gKlxuICogZXhwZWN0KHN0YXRlKS50b0VxdWFsKHsgZm9vOiB7IGJhcjogJ3N0cjInIH0sIGFycjogW10gfSk7XG4gKiBleHBlY3Qoc3RhdGUpLm5vdC50b0JlKGJhc2VTdGF0ZSk7XG4gKiBleHBlY3Qoc3RhdGUuZm9vKS5ub3QudG9CZShiYXNlU3RhdGUuZm9vKTtcbiAqIGV4cGVjdChzdGF0ZS5hcnIpLnRvQmUoYmFzZVN0YXRlLmFycik7XG4gKiBleHBlY3QoT2JqZWN0LmlzRnJvemVuKHN0YXRlKSkudG9CZVRydXRoeSgpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBtYWtlQ3JlYXRvcjogTWFrZUNyZWF0b3IgPSAoYXJnKSA9PiB7XG4gIGlmIChcbiAgICBfX0RFVl9fICYmXG4gICAgYXJnICE9PSB1bmRlZmluZWQgJiZcbiAgICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJnKSAhPT0gJ1tvYmplY3QgT2JqZWN0XSdcbiAgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEludmFsaWQgb3B0aW9uczogJHtTdHJpbmcoYXJnKX0sICdvcHRpb25zJyBzaG91bGQgYmUgYW4gb2JqZWN0LmBcbiAgICApO1xuICB9XG4gIHJldHVybiBmdW5jdGlvbiBjcmVhdGUoYXJnMDogYW55LCBhcmcxOiBhbnksIGFyZzI/OiBhbnkpOiBhbnkge1xuICAgIGlmICh0eXBlb2YgYXJnMCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgYXJnMSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aGlzOiBhbnksIGJhc2U6IGFueSwgLi4uYXJnczogYW55W10pIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZShcbiAgICAgICAgICBiYXNlLFxuICAgICAgICAgIChkcmFmdDogYW55KSA9PiBhcmcwLmNhbGwodGhpcywgZHJhZnQsIC4uLmFyZ3MpLFxuICAgICAgICAgIGFyZzFcbiAgICAgICAgKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGNvbnN0IGJhc2UgPSBhcmcwO1xuICAgIGNvbnN0IG11dGF0ZSA9IGFyZzEgYXMgKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnk7XG4gICAgbGV0IG9wdGlvbnMgPSBhcmcyO1xuICAgIGlmICh0eXBlb2YgYXJnMSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgb3B0aW9ucyA9IGFyZzE7XG4gICAgfVxuICAgIGlmIChcbiAgICAgIF9fREVWX18gJiZcbiAgICAgIG9wdGlvbnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9wdGlvbnMpICE9PSAnW29iamVjdCBPYmplY3RdJ1xuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBvcHRpb25zOiAke29wdGlvbnN9LCAnb3B0aW9ucycgc2hvdWxkIGJlIGFuIG9iamVjdC5gXG4gICAgICApO1xuICAgIH1cbiAgICBvcHRpb25zID0ge1xuICAgICAgLi4uYXJnLFxuICAgICAgLi4ub3B0aW9ucyxcbiAgICB9O1xuICAgIGNvbnN0IHN0YXRlID0gaXNEcmFmdChiYXNlKSA/IGN1cnJlbnQoYmFzZSkgOiBiYXNlO1xuICAgIGNvbnN0IG1hcmsgPSBBcnJheS5pc0FycmF5KG9wdGlvbnMubWFyaylcbiAgICAgID8gKCgodmFsdWU6IHVua25vd24sIHR5cGVzOiB0eXBlb2YgZGF0YVR5cGVzKSA9PiB7XG4gICAgICAgICAgZm9yIChjb25zdCBtYXJrIG9mIG9wdGlvbnMubWFyayBhcyBNYXJrPGFueSwgYW55PltdKSB7XG4gICAgICAgICAgICBpZiAoX19ERVZfXyAmJiB0eXBlb2YgbWFyayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYEludmFsaWQgbWFyazogJHttYXJrfSwgJ21hcmsnIHNob3VsZCBiZSBhIGZ1bmN0aW9uLmBcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1hcmsodmFsdWUsIHR5cGVzKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9KSBhcyBNYXJrPGFueSwgYW55PilcbiAgICAgIDogb3B0aW9ucy5tYXJrO1xuICAgIGNvbnN0IGVuYWJsZVBhdGNoZXMgPSBvcHRpb25zLmVuYWJsZVBhdGNoZXMgPz8gZmFsc2U7XG4gICAgY29uc3Qgc3RyaWN0ID0gb3B0aW9ucy5zdHJpY3QgPz8gZmFsc2U7XG4gICAgY29uc3QgZW5hYmxlQXV0b0ZyZWV6ZSA9IG9wdGlvbnMuZW5hYmxlQXV0b0ZyZWV6ZSA/PyBmYWxzZTtcbiAgICBjb25zdCBfb3B0aW9uczogT3B0aW9uczxhbnksIGFueT4gPSB7XG4gICAgICBlbmFibGVBdXRvRnJlZXplLFxuICAgICAgbWFyayxcbiAgICAgIHN0cmljdCxcbiAgICAgIGVuYWJsZVBhdGNoZXMsXG4gICAgfTtcbiAgICBpZiAoXG4gICAgICAhaXNEcmFmdGFibGUoc3RhdGUsIF9vcHRpb25zKSAmJlxuICAgICAgdHlwZW9mIHN0YXRlID09PSAnb2JqZWN0JyAmJlxuICAgICAgc3RhdGUgIT09IG51bGxcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgYmFzZSBzdGF0ZTogY3JlYXRlKCkgb25seSBzdXBwb3J0cyBwbGFpbiBvYmplY3RzLCBhcnJheXMsIFNldCwgTWFwIG9yIHVzaW5nIG1hcmsoKSB0byBtYXJrIHRoZSBzdGF0ZSBhcyBpbW11dGFibGUuYFxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgW2RyYWZ0LCBmaW5hbGl6ZV0gPSBkcmFmdGlmeShzdGF0ZSwgX29wdGlvbnMpO1xuICAgIGlmICh0eXBlb2YgYXJnMSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKCFpc0RyYWZ0YWJsZShzdGF0ZSwgX29wdGlvbnMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSW52YWxpZCBiYXNlIHN0YXRlOiBjcmVhdGUoKSBvbmx5IHN1cHBvcnRzIHBsYWluIG9iamVjdHMsIGFycmF5cywgU2V0LCBNYXAgb3IgdXNpbmcgbWFyaygpIHRvIG1hcmsgdGhlIHN0YXRlIGFzIGltbXV0YWJsZS5gXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gW2RyYWZ0LCBmaW5hbGl6ZV07XG4gICAgfVxuICAgIGxldCByZXN1bHQ6IGFueTtcbiAgICB0cnkge1xuICAgICAgcmVzdWx0ID0gbXV0YXRlKGRyYWZ0KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV2b2tlUHJveHkoZ2V0UHJveHlEcmFmdChkcmFmdCkpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICAgIGNvbnN0IHJldHVyblZhbHVlID0gKHZhbHVlOiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IHByb3h5RHJhZnQgPSBnZXRQcm94eURyYWZ0KGRyYWZ0KSE7XG4gICAgICBpZiAoIWlzRHJhZnQodmFsdWUpKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICB2YWx1ZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgIWlzRXF1YWwodmFsdWUsIGRyYWZ0KSAmJlxuICAgICAgICAgIHByb3h5RHJhZnQ/Lm9wZXJhdGVkXG4gICAgICAgICkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBFaXRoZXIgdGhlIHZhbHVlIGlzIHJldHVybmVkIGFzIGEgbmV3IG5vbi1kcmFmdCB2YWx1ZSwgb3Igb25seSB0aGUgZHJhZnQgaXMgbW9kaWZpZWQgd2l0aG91dCByZXR1cm5pbmcgYW55IHZhbHVlLmBcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJhd1JldHVyblZhbHVlID0gdmFsdWU/LltSQVdfUkVUVVJOX1NZTUJPTF0gYXMgW2FueV0gfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChyYXdSZXR1cm5WYWx1ZSkge1xuICAgICAgICAgIGNvbnN0IF92YWx1ZSA9IHJhd1JldHVyblZhbHVlWzBdO1xuICAgICAgICAgIGlmIChfb3B0aW9ucy5zdHJpY3QgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaGFuZGxlUmV0dXJuVmFsdWUoe1xuICAgICAgICAgICAgICByb290RHJhZnQ6IHByb3h5RHJhZnQsXG4gICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgICB1c2VSYXdSZXR1cm46IHRydWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZpbmFsaXplKFtfdmFsdWVdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICBoYW5kbGVSZXR1cm5WYWx1ZSh7IHJvb3REcmFmdDogcHJveHlEcmFmdCwgdmFsdWUgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmaW5hbGl6ZShbdmFsdWVdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHZhbHVlID09PSBkcmFmdCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBmaW5hbGl6ZShbXSk7XG4gICAgICB9XG4gICAgICBjb25zdCByZXR1cm5lZFByb3h5RHJhZnQgPSBnZXRQcm94eURyYWZ0KHZhbHVlKSE7XG4gICAgICBpZiAoX29wdGlvbnMgPT09IHJldHVybmVkUHJveHlEcmFmdC5vcHRpb25zKSB7XG4gICAgICAgIGlmIChyZXR1cm5lZFByb3h5RHJhZnQub3BlcmF0ZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXR1cm4gYSBtb2RpZmllZCBjaGlsZCBkcmFmdC5gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmluYWxpemUoW2N1cnJlbnQodmFsdWUpXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmluYWxpemUoW3ZhbHVlXSk7XG4gICAgfTtcbiAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKHJldHVyblZhbHVlLCAoZXJyb3IpID0+IHtcbiAgICAgICAgcmV2b2tlUHJveHkoZ2V0UHJveHlEcmFmdChkcmFmdCkhKTtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJldHVyblZhbHVlKHJlc3VsdCk7XG4gIH07XG59O1xuIiwgImltcG9ydCB7IG1ha2VDcmVhdG9yIH0gZnJvbSAnLi9tYWtlQ3JlYXRvcic7XG5cbi8qKlxuICogYGNyZWF0ZShiYXNlU3RhdGUsIGNhbGxiYWNrLCBvcHRpb25zKWAgdG8gY3JlYXRlIHRoZSBuZXh0IHN0YXRlXG4gKlxuICogIyMgRXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBjcmVhdGUgfSBmcm9tICcuLi9pbmRleCc7XG4gKlxuICogY29uc3QgYmFzZVN0YXRlID0geyBmb286IHsgYmFyOiAnc3RyJyB9LCBhcnI6IFtdIH07XG4gKiBjb25zdCBzdGF0ZSA9IGNyZWF0ZShcbiAqICAgYmFzZVN0YXRlLFxuICogICAoZHJhZnQpID0+IHtcbiAqICAgICBkcmFmdC5mb28uYmFyID0gJ3N0cjInO1xuICogICB9LFxuICogKTtcbiAqXG4gKiBleHBlY3Qoc3RhdGUpLnRvRXF1YWwoeyBmb286IHsgYmFyOiAnc3RyMicgfSwgYXJyOiBbXSB9KTtcbiAqIGV4cGVjdChzdGF0ZSkubm90LnRvQmUoYmFzZVN0YXRlKTtcbiAqIGV4cGVjdChzdGF0ZS5mb28pLm5vdC50b0JlKGJhc2VTdGF0ZS5mb28pO1xuICogZXhwZWN0KHN0YXRlLmFycikudG9CZShiYXNlU3RhdGUuYXJyKTtcbiAqIGBgYFxuICovXG5jb25zdCBjcmVhdGUgPSBtYWtlQ3JlYXRvcigpO1xuXG5leHBvcnQgeyBjcmVhdGUgfTtcbiIsICJpbXBvcnQgeyBPcGVyYXRpb24sIERyYWZ0VHlwZSB9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB0eXBlIHtcbiAgRHJhZnQsXG4gIFBhdGNoZXMsXG4gIEFwcGx5TXV0YWJsZU9wdGlvbnMsXG4gIEFwcGx5T3B0aW9ucyxcbiAgQXBwbHlSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7IGRlZXBDbG9uZSwgZ2V0LCBnZXRUeXBlLCBpc0RyYWZ0LCB1bmVzY2FwZVBhdGggfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGNyZWF0ZSB9IGZyb20gJy4vY3JlYXRlJztcblxuLyoqXG4gKiBgYXBwbHkoc3RhdGUsIHBhdGNoZXMpYCB0byBhcHBseSBwYXRjaGVzIHRvIHN0YXRlXG4gKlxuICogIyMgRXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBjcmVhdGUsIGFwcGx5IH0gZnJvbSAnLi4vaW5kZXgnO1xuICpcbiAqIGNvbnN0IGJhc2VTdGF0ZSA9IHsgZm9vOiB7IGJhcjogJ3N0cicgfSwgYXJyOiBbXSB9O1xuICogY29uc3QgW3N0YXRlLCBwYXRjaGVzXSA9IGNyZWF0ZShcbiAqICAgYmFzZVN0YXRlLFxuICogICAoZHJhZnQpID0+IHtcbiAqICAgICBkcmFmdC5mb28uYmFyID0gJ3N0cjInO1xuICogICB9LFxuICogICB7IGVuYWJsZVBhdGNoZXM6IHRydWUgfVxuICogKTtcbiAqIGV4cGVjdChzdGF0ZSkudG9FcXVhbCh7IGZvbzogeyBiYXI6ICdzdHIyJyB9LCBhcnI6IFtdIH0pO1xuICogZXhwZWN0KHBhdGNoZXMpLnRvRXF1YWwoW3sgb3A6ICdyZXBsYWNlJywgcGF0aDogWydmb28nLCAnYmFyJ10sIHZhbHVlOiAnc3RyMicgfV0pO1xuICogZXhwZWN0KHN0YXRlKS50b0VxdWFsKGFwcGx5KGJhc2VTdGF0ZSwgcGF0Y2hlcykpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseTxcbiAgVCBleHRlbmRzIG9iamVjdCxcbiAgRiBleHRlbmRzIGJvb2xlYW4gPSBmYWxzZSxcbiAgQSBleHRlbmRzIEFwcGx5T3B0aW9uczxGPiA9IEFwcGx5T3B0aW9uczxGPixcbj4oc3RhdGU6IFQsIHBhdGNoZXM6IFBhdGNoZXMsIGFwcGx5T3B0aW9ucz86IEEpOiBBcHBseVJlc3VsdDxULCBGLCBBPiB7XG4gIGxldCBpOiBudW1iZXI7XG4gIGZvciAoaSA9IHBhdGNoZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpIC09IDEpIHtcbiAgICBjb25zdCB7IHZhbHVlLCBvcCwgcGF0aCB9ID0gcGF0Y2hlc1tpXTtcbiAgICBpZiAoXG4gICAgICAoIXBhdGgubGVuZ3RoICYmIG9wID09PSBPcGVyYXRpb24uUmVwbGFjZSkgfHxcbiAgICAgIChwYXRoID09PSAnJyAmJiBvcCA9PT0gT3BlcmF0aW9uLkFkZClcbiAgICApIHtcbiAgICAgIHN0YXRlID0gdmFsdWU7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgaWYgKGkgPiAtMSkge1xuICAgIHBhdGNoZXMgPSBwYXRjaGVzLnNsaWNlKGkgKyAxKTtcbiAgfVxuICBjb25zdCBtdXRhdGUgPSAoZHJhZnQ6IERyYWZ0PFQ+IHwgVCkgPT4ge1xuICAgIHBhdGNoZXMuZm9yRWFjaCgocGF0Y2gpID0+IHtcbiAgICAgIGNvbnN0IHsgcGF0aDogX3BhdGgsIG9wIH0gPSBwYXRjaDtcbiAgICAgIGNvbnN0IHBhdGggPSB1bmVzY2FwZVBhdGgoX3BhdGgpO1xuICAgICAgbGV0IGJhc2U6IGFueSA9IGRyYWZ0O1xuICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHBhdGgubGVuZ3RoIC0gMTsgaW5kZXggKz0gMSkge1xuICAgICAgICBjb25zdCBwYXJlbnRUeXBlID0gZ2V0VHlwZShiYXNlKTtcbiAgICAgICAgbGV0IGtleSA9IHBhdGhbaW5kZXhdO1xuICAgICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIGtleSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICBrZXkgPSBTdHJpbmcoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXG4gICAgICAgICAgKChwYXJlbnRUeXBlID09PSBEcmFmdFR5cGUuT2JqZWN0IHx8XG4gICAgICAgICAgICBwYXJlbnRUeXBlID09PSBEcmFmdFR5cGUuQXJyYXkpICYmXG4gICAgICAgICAgICAoa2V5ID09PSAnX19wcm90b19fJyB8fCBrZXkgPT09ICdjb25zdHJ1Y3RvcicpKSB8fFxuICAgICAgICAgICh0eXBlb2YgYmFzZSA9PT0gJ2Z1bmN0aW9uJyAmJiBrZXkgPT09ICdwcm90b3R5cGUnKVxuICAgICAgICApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgUGF0Y2hpbmcgcmVzZXJ2ZWQgYXR0cmlidXRlcyBsaWtlIF9fcHJvdG9fXyBhbmQgY29uc3RydWN0b3IgaXMgbm90IGFsbG93ZWQuYFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdXNlIGBpbmRleGAgaW4gU2V0IGRyYWZ0XG4gICAgICAgIGJhc2UgPSBnZXQocGFyZW50VHlwZSA9PT0gRHJhZnRUeXBlLlNldCA/IEFycmF5LmZyb20oYmFzZSkgOiBiYXNlLCBrZXkpO1xuICAgICAgICBpZiAodHlwZW9mIGJhc2UgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgYXBwbHkgcGF0Y2ggYXQgJyR7cGF0aC5qb2luKCcvJyl9Jy5gKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCB0eXBlID0gZ2V0VHlwZShiYXNlKTtcbiAgICAgIC8vIGVuc3VyZSB0aGUgb3JpZ2luYWwgcGF0Y2ggaXMgbm90IG1vZGlmaWVkLlxuICAgICAgY29uc3QgdmFsdWUgPSBkZWVwQ2xvbmUocGF0Y2gudmFsdWUpO1xuICAgICAgY29uc3Qga2V5ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgc3dpdGNoIChvcCkge1xuICAgICAgICBjYXNlIE9wZXJhdGlvbi5SZXBsYWNlOlxuICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBEcmFmdFR5cGUuTWFwOlxuICAgICAgICAgICAgICByZXR1cm4gYmFzZS5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICBjYXNlIERyYWZ0VHlwZS5TZXQ6XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGFwcGx5IHJlcGxhY2UgcGF0Y2ggdG8gc2V0LmApO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuIChiYXNlW2tleV0gPSB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICBjYXNlIE9wZXJhdGlvbi5BZGQ6XG4gICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIERyYWZ0VHlwZS5BcnJheTpcbiAgICAgICAgICAgICAgLy8gSWYgdGhlIFwiLVwiIGNoYXJhY3RlciBpcyB1c2VkIHRvXG4gICAgICAgICAgICAgIC8vIGluZGV4IHRoZSBlbmQgb2YgdGhlIGFycmF5IChzZWUgW1JGQzY5MDFdKGh0dHBzOi8vZGF0YXRyYWNrZXIuaWV0Zi5vcmcvZG9jL2h0bWwvcmZjNjkwMikpLFxuICAgICAgICAgICAgICAvLyB0aGlzIGhhcyB0aGUgZWZmZWN0IG9mIGFwcGVuZGluZyB0aGUgdmFsdWUgdG8gdGhlIGFycmF5LlxuICAgICAgICAgICAgICByZXR1cm4ga2V5ID09PSAnLSdcbiAgICAgICAgICAgICAgICA/IGJhc2UucHVzaCh2YWx1ZSlcbiAgICAgICAgICAgICAgICA6IGJhc2Uuc3BsaWNlKGtleSBhcyBudW1iZXIsIDAsIHZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgRHJhZnRUeXBlLk1hcDpcbiAgICAgICAgICAgICAgcmV0dXJuIGJhc2Uuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgY2FzZSBEcmFmdFR5cGUuU2V0OlxuICAgICAgICAgICAgICByZXR1cm4gYmFzZS5hZGQodmFsdWUpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuIChiYXNlW2tleV0gPSB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICBjYXNlIE9wZXJhdGlvbi5SZW1vdmU6XG4gICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIERyYWZ0VHlwZS5BcnJheTpcbiAgICAgICAgICAgICAgcmV0dXJuIGJhc2Uuc3BsaWNlKGtleSBhcyBudW1iZXIsIDEpO1xuICAgICAgICAgICAgY2FzZSBEcmFmdFR5cGUuTWFwOlxuICAgICAgICAgICAgICByZXR1cm4gYmFzZS5kZWxldGUoa2V5KTtcbiAgICAgICAgICAgIGNhc2UgRHJhZnRUeXBlLlNldDpcbiAgICAgICAgICAgICAgcmV0dXJuIGJhc2UuZGVsZXRlKHBhdGNoLnZhbHVlKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiBkZWxldGUgYmFzZVtrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHBhdGNoIG9wZXJhdGlvbjogJHtvcH0uYCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIGlmICgoYXBwbHlPcHRpb25zIGFzIEFwcGx5TXV0YWJsZU9wdGlvbnMpPy5tdXRhYmxlKSB7XG4gICAgaWYgKF9fREVWX18pIHtcbiAgICAgIGlmIChcbiAgICAgICAgT2JqZWN0LmtleXMoYXBwbHlPcHRpb25zISkuZmlsdGVyKChrZXkpID0+IGtleSAhPT0gJ211dGFibGUnKS5sZW5ndGhcbiAgICAgICkge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgJ1RoZSBcIm11dGFibGVcIiBvcHRpb24gaXMgbm90IGFsbG93ZWQgdG8gYmUgdXNlZCB3aXRoIG90aGVyIG9wdGlvbnMuJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICBtdXRhdGUoc3RhdGUpO1xuICAgIHJldHVybiB1bmRlZmluZWQgYXMgQXBwbHlSZXN1bHQ8VCwgRiwgQT47XG4gIH1cbiAgaWYgKGlzRHJhZnQoc3RhdGUpKSB7XG4gICAgaWYgKGFwcGx5T3B0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBhcHBseSBwYXRjaGVzIHdpdGggb3B0aW9ucyB0byBhIGRyYWZ0LmApO1xuICAgIH1cbiAgICBtdXRhdGUoc3RhdGUgYXMgRHJhZnQ8VD4pO1xuICAgIHJldHVybiBzdGF0ZSBhcyBBcHBseVJlc3VsdDxULCBGLCBBPjtcbiAgfVxuICByZXR1cm4gY3JlYXRlPFQsIEY+KHN0YXRlLCBtdXRhdGUsIHtcbiAgICAuLi5hcHBseU9wdGlvbnMsXG4gICAgZW5hYmxlUGF0Y2hlczogZmFsc2UsXG4gIH0pIGFzIFQgYXMgQXBwbHlSZXN1bHQ8VCwgRiwgQT47XG59XG4iLCAiaW1wb3J0IHsgZ2V0UHJveHlEcmFmdCB9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIGBvcmlnaW5hbChkcmFmdClgIHRvIGdldCBvcmlnaW5hbCBzdGF0ZSBpbiB0aGUgZHJhZnQgbXV0YXRpb24gZnVuY3Rpb24uXG4gKlxuICogIyMgRXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBjcmVhdGUsIG9yaWdpbmFsIH0gZnJvbSAnLi4vaW5kZXgnO1xuICpcbiAqIGNvbnN0IGJhc2VTdGF0ZSA9IHsgZm9vOiB7IGJhcjogJ3N0cicgfSwgYXJyOiBbXSB9O1xuICogY29uc3Qgc3RhdGUgPSBjcmVhdGUoXG4gKiAgIGJhc2VTdGF0ZSxcbiAqICAgKGRyYWZ0KSA9PiB7XG4gKiAgICAgZHJhZnQuZm9vLmJhciA9ICdzdHIyJztcbiAqICAgICBleHBlY3Qob3JpZ2luYWwoZHJhZnQuZm9vKSkudG9FcXVhbCh7IGJhcjogJ3N0cicgfSk7XG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9yaWdpbmFsPFQ+KHRhcmdldDogVCk6IFQge1xuICBjb25zdCBwcm94eURyYWZ0ID0gZ2V0UHJveHlEcmFmdCh0YXJnZXQpO1xuICBpZiAoIXByb3h5RHJhZnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgb3JpZ2luYWwoKSBpcyBvbmx5IHVzZWQgZm9yIGEgZHJhZnQsIHBhcmFtZXRlcjogJHt0YXJnZXR9YFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHByb3h5RHJhZnQub3JpZ2luYWw7XG59XG4iLCAiaW1wb3J0IHsgUkFXX1JFVFVSTl9TWU1CT0wgfSBmcm9tICcuL2NvbnN0YW50JztcblxuLyoqXG4gKiBVc2UgcmF3UmV0dXJuKCkgdG8gd3JhcCB0aGUgcmV0dXJuIHZhbHVlIHRvIHNraXAgdGhlIGRyYWZ0IGNoZWNrIGFuZCB0aHVzIGltcHJvdmUgcGVyZm9ybWFuY2UuXG4gKlxuICogIyMgRXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBjcmVhdGUsIHJhd1JldHVybiB9IGZyb20gJy4uL2luZGV4JztcbiAqXG4gKiBjb25zdCBiYXNlU3RhdGUgPSB7IGZvbzogeyBiYXI6ICdzdHInIH0sIGFycjogW10gfTtcbiAqIGNvbnN0IHN0YXRlID0gY3JlYXRlKFxuICogICBiYXNlU3RhdGUsXG4gKiAgIChkcmFmdCkgPT4ge1xuICogICAgIHJldHVybiByYXdSZXR1cm4oYmFzZVN0YXRlKTtcbiAqICAgfSxcbiAqICk7XG4gKiBleHBlY3Qoc3RhdGUpLnRvQmUoYmFzZVN0YXRlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmF3UmV0dXJuPFQgZXh0ZW5kcyBvYmplY3QgfCB1bmRlZmluZWQ+KHZhbHVlOiBUKTogVCB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdyYXdSZXR1cm4oKSBtdXN0IGJlIGNhbGxlZCB3aXRoIGEgdmFsdWUuJyk7XG4gIH1cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdyYXdSZXR1cm4oKSBtdXN0IGJlIGNhbGxlZCB3aXRoIG9uZSBhcmd1bWVudC4nKTtcbiAgfVxuICBpZiAoXG4gICAgX19ERVZfXyAmJlxuICAgIHZhbHVlICE9PSB1bmRlZmluZWQgJiZcbiAgICAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JyB8fCB2YWx1ZSA9PT0gbnVsbClcbiAgKSB7XG4gICAgY29uc29sZS53YXJuKFxuICAgICAgJ3Jhd1JldHVybigpIG11c3QgYmUgY2FsbGVkIHdpdGggYW4gb2JqZWN0KGluY2x1ZGluZyBwbGFpbiBvYmplY3QsIGFycmF5cywgU2V0LCBNYXAsIGV0Yy4pIG9yIGB1bmRlZmluZWRgLCBvdGhlciB0eXBlcyBkbyBub3QgbmVlZCB0byBiZSByZXR1cm5lZCB2aWEgcmF3UmV0dXJuKCkuJ1xuICAgICk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBbUkFXX1JFVFVSTl9TWU1CT0xdOiBbdmFsdWVdLFxuICB9IGFzIG5ldmVyO1xufVxuIiwgImltcG9ydCB7IGRhdGFUeXBlcyB9IGZyb20gJy4uL2NvbnN0YW50JztcblxuY29uc3QgY29uc3RydWN0b3JTdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLmNvbnN0cnVjdG9yLnRvU3RyaW5nKCk7XG4vKipcbiAqIENoZWNrIGlmIHRoZSB2YWx1ZSBpcyBhIHNpbXBsZSBvYmplY3QoTm8gcHJvdG90eXBlIGNoYWluIG9iamVjdCBvciBpZnJhbWUgc2FtZS1vcmlnaW4gb2JqZWN0KSxcbiAqIHN1cHBvcnQgY2FzZTogaHR0cHM6Ly9naXRodWIuY29tL3VuYWRsaWIvbXV0YXRpdmUvaXNzdWVzLzE3XG4gKi9cbmNvbnN0IGlzU2ltcGxlT2JqZWN0ID0gKHZhbHVlOiB1bmtub3duKSA9PiB7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBwcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpO1xuICBpZiAocHJvdG90eXBlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgY29uc3QgY29uc3RydWN0b3IgPVxuICAgIE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJykgJiZcbiAgICBwcm90b3R5cGUuY29uc3RydWN0b3I7XG5cbiAgaWYgKGNvbnN0cnVjdG9yID09PSBPYmplY3QpIHJldHVybiB0cnVlO1xuXG4gIHJldHVybiAoXG4gICAgdHlwZW9mIGNvbnN0cnVjdG9yID09PSAnZnVuY3Rpb24nICYmXG4gICAgRnVuY3Rpb24udG9TdHJpbmcuY2FsbChjb25zdHJ1Y3RvcikgPT09IGNvbnN0cnVjdG9yU3RyaW5nXG4gICk7XG59O1xuXG5leHBvcnQgY29uc3QgbWFya1NpbXBsZU9iamVjdCA9ICh2YWx1ZTogdW5rbm93bikgPT4ge1xuICBpZiAoaXNTaW1wbGVPYmplY3QodmFsdWUpKSB7XG4gICAgcmV0dXJuIGRhdGFUeXBlcy5pbW11dGFibGU7XG4gIH1cbiAgcmV0dXJuO1xufTtcbiIsICJpbXBvcnQgeyBEcmFmdCwgSW1tdXRhYmxlIH0gZnJvbSAnLi4vaW50ZXJmYWNlJztcblxuLyoqXG4gKiBDYXN0IGEgdmFsdWUgdG8gYW4gRHJhZnQgdHlwZSB2YWx1ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhc3REcmFmdDxUPih2YWx1ZTogVCk6IERyYWZ0PFQ+IHtcbiAgcmV0dXJuIHZhbHVlIGFzIGFueTtcbn1cblxuLyoqXG4gKiBDYXN0IGEgdmFsdWUgdG8gYW4gSW1tdXRhYmxlIHR5cGUgdmFsdWUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXN0SW1tdXRhYmxlPFQ+KHZhbHVlOiBUKTogSW1tdXRhYmxlPFQ+IHtcbiAgcmV0dXJuIHZhbHVlIGFzIGFueTtcbn1cblxuLyoqXG4gKiBDYXN0IGEgdmFsdWUgdG8gYW4gTXV0YWJsZSB0eXBlIHZhbHVlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FzdE11dGFibGU8VD4oZHJhZnQ6IERyYWZ0PFQ+KTogVCB7XG4gIHJldHVybiBkcmFmdCBhcyBhbnk7XG59XG4iLCAiaW1wb3J0IHsgQ29udGV4dCwgRWZmZWN0LCBMYXllciwgU2NoZW1hIH0gZnJvbSBcImVmZmVjdFwiXG5pbXBvcnQgKiBhcyBNb2R1bGVSdW50aW1lSW1wbCBmcm9tIFwiLi9Nb2R1bGVSdW50aW1lLmpzXCJcbmltcG9ydCAqIGFzIEJvdW5kQXBpUnVudGltZSBmcm9tIFwiLi9Cb3VuZEFwaVJ1bnRpbWUuanNcIlxuaW1wb3J0ICogYXMgTG9naWNEaWFnbm9zdGljcyBmcm9tIFwiLi9jb3JlL0xvZ2ljRGlhZ25vc3RpY3MuanNcIlxuaW1wb3J0IHR5cGUge1xuICBBbnlNb2R1bGVTaGFwZSxcbiAgQW55U2NoZW1hLFxuICBNb2R1bGVJbnN0YW5jZSxcbiAgTW9kdWxlU2hhcGUsXG4gIFN0YXRlT2YsXG4gIEFjdGlvbk9mLFxuICBNb2R1bGVIYW5kbGUsXG4gIE1vZHVsZUxvZ2ljLFxuICBNb2R1bGVJbXBsLFxufSBmcm9tIFwiLi9jb3JlL21vZHVsZS5qc1wiXG5cbi8qKlxuICogdjM6IExpbmsgKFx1NTM5RiBPcmNoZXN0cmF0b3IpXG4gKiBcdTc1MjhcdTRFOEVcdThERThcdTZBMjFcdTU3NTdcdTUzNEZcdTRGNUNcdTc2ODRcdTgwRjZcdTZDMzRcdTVDNDJcdTMwMDJcbiAqXG4gKiAtIFx1NEUwRFx1NjMwMVx1NjcwOVx1ODFFQVx1NURGMVx1NzY4NCBTdGF0ZVx1RkYxQlxuICogLSBcdTUzRUZcdTRFRTVcdThCQkZcdTk1RUVcdTU5MUFcdTRFMkEgTW9kdWxlIFx1NzY4NCBSZWFkb25seUhhbmRsZVx1RkYxQlxuICogLSBcdTUzRUFcdTgwRkRcdTVCOUFcdTRFNDkgTG9naWNcdUZGMENcdTRFMERcdTgwRkRcdTVCOUFcdTRFNDkgU3RhdGUvQWN0aW9uXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBMaW5rPFxuICBNb2R1bGVzIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgTW9kdWxlSW5zdGFuY2U8YW55LCBBbnlNb2R1bGVTaGFwZT4+LFxuICBFID0gbmV2ZXIsXG4gIFIgPSBuZXZlclxuPihcbiAgbW9kdWxlczogTW9kdWxlcyxcbiAgbG9naWM6IChcbiAgICAkOiB7IFtLIGluIGtleW9mIE1vZHVsZXNdOiBNb2R1bGVIYW5kbGU8TW9kdWxlc1tLXVtcInNoYXBlXCJdPiB9XG4gICkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkLCBFLCBSPlxuKTogRWZmZWN0LkVmZmVjdDx2b2lkLCBFLCBSPiB7XG4gIHJldHVybiBFZmZlY3QuZ2VuKGZ1bmN0aW9uKiAoKSB7XG4gICAgY29uc3QgaGFuZGxlczogUmVjb3JkPHN0cmluZywgTW9kdWxlSGFuZGxlPEFueU1vZHVsZVNoYXBlPj4gPSB7fVxuXG4gICAgZm9yIChjb25zdCBba2V5LCBtb2R1bGVdIG9mIE9iamVjdC5lbnRyaWVzKG1vZHVsZXMpKSB7XG4gICAgICBjb25zdCBydW50aW1lID0geWllbGQqIG1vZHVsZVxuXG4gICAgICBoYW5kbGVzW2tleV0gPSB7XG4gICAgICAgIHJlYWQ6IChzZWxlY3RvcjogYW55KSA9PiBFZmZlY3QubWFwKHJ1bnRpbWUuZ2V0U3RhdGUsIHNlbGVjdG9yKSxcbiAgICAgICAgY2hhbmdlczogcnVudGltZS5jaGFuZ2VzLFxuICAgICAgICBkaXNwYXRjaDogcnVudGltZS5kaXNwYXRjaCxcbiAgICAgICAgYWN0aW9ucyQ6IHJ1bnRpbWUuYWN0aW9ucyQsXG4gICAgICAgIGFjdGlvbnM6IG5ldyBQcm94eSh7fSwge1xuICAgICAgICAgIGdldDogKF90YXJnZXQsIHByb3ApID0+XG4gICAgICAgICAgICAocGF5bG9hZDogYW55KSA9PlxuICAgICAgICAgICAgICBydW50aW1lLmRpc3BhdGNoKHsgX3RhZzogcHJvcCBhcyBzdHJpbmcsIHBheWxvYWQgfSksXG4gICAgICAgIH0pLFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB5aWVsZCogbG9naWMoXG4gICAgICBoYW5kbGVzIGFzIHtcbiAgICAgICAgW0sgaW4ga2V5b2YgTW9kdWxlc106IE1vZHVsZUhhbmRsZTxNb2R1bGVzW0tdW1wic2hhcGVcIl0+XG4gICAgICB9XG4gICAgKVxuICB9KVxufVxuXG4vKipcbiAqIE1vZHVsZSBcdTVERTVcdTUzODJcdTVCOUVcdTczQjBcdUZGMUFcdTY4MzlcdTYzNkUgaWQgXHU1NDhDIFNjaGVtYSBcdTVCOUFcdTRFNDlcdTY3ODRcdTkwMjAgTW9kdWxlSW5zdGFuY2VcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIE1vZHVsZTxcbiAgSWQgZXh0ZW5kcyBzdHJpbmcsXG4gIFNTY2hlbWEgZXh0ZW5kcyBBbnlTY2hlbWEsXG4gIEFNYXAgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBBbnlTY2hlbWE+XG4+KFxuICBpZDogSWQsXG4gIGRlZjoge1xuICAgIHJlYWRvbmx5IHN0YXRlOiBTU2NoZW1hXG4gICAgcmVhZG9ubHkgYWN0aW9uczogQU1hcFxuICAgIHJlYWRvbmx5IHJlZHVjZXJzPzoge1xuICAgICAgcmVhZG9ubHkgW0sgaW4ga2V5b2YgQU1hcF0/OiAoXG4gICAgICAgIHN0YXRlOiBTY2hlbWEuU2NoZW1hLlR5cGU8U1NjaGVtYT4sXG4gICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgIHJlYWRvbmx5IF90YWc6IEtcbiAgICAgICAgICByZWFkb25seSBwYXlsb2FkOiBTY2hlbWEuU2NoZW1hLlR5cGU8QU1hcFtLXT5cbiAgICAgICAgfVxuICAgICAgKSA9PiBTY2hlbWEuU2NoZW1hLlR5cGU8U1NjaGVtYT5cbiAgICB9XG4gIH1cbik6IE1vZHVsZUluc3RhbmNlPFxuICBJZCxcbiAgTW9kdWxlU2hhcGU8U1NjaGVtYSwgU2NoZW1hLlNjaGVtYTx7XG4gICAgW0sgaW4ga2V5b2YgQU1hcF06IHtcbiAgICAgIHJlYWRvbmx5IF90YWc6IEtcbiAgICAgIHJlYWRvbmx5IHBheWxvYWQ6IFNjaGVtYS5TY2hlbWEuVHlwZTxBTWFwW0tdPlxuICAgICAgfVxuICAgIH1ba2V5b2YgQU1hcF0+LCBBTWFwPlxuPiB7XG4gIGNvbnN0IHNoYXBlOiBNb2R1bGVTaGFwZTxcbiAgICBTU2NoZW1hLFxuICAgIFNjaGVtYS5TY2hlbWE8e1xuICAgICAgW0sgaW4ga2V5b2YgQU1hcF06IHtcbiAgICAgICAgcmVhZG9ubHkgX3RhZzogS1xuICAgICAgICByZWFkb25seSBwYXlsb2FkOiBTY2hlbWEuU2NoZW1hLlR5cGU8QU1hcFtLXT5cbiAgICAgIH1cbiAgICB9W2tleW9mIEFNYXBdPixcbiAgICBBTWFwXG4gID4gPSB7XG4gICAgc3RhdGVTY2hlbWE6IGRlZi5zdGF0ZSxcbiAgICBhY3Rpb25TY2hlbWE6IFNjaGVtYS5VbmlvbihcbiAgICAgIC4uLk9iamVjdC5lbnRyaWVzKGRlZi5hY3Rpb25zKS5tYXAoKFt0YWcsIHBheWxvYWRdKSA9PlxuICAgICAgICBTY2hlbWEuU3RydWN0KHtcbiAgICAgICAgICBfdGFnOiBTY2hlbWEuTGl0ZXJhbCh0YWcpLFxuICAgICAgICAgIHBheWxvYWQsXG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKSBhcyBhbnksXG4gICAgYWN0aW9uTWFwOiBkZWYuYWN0aW9ucyxcbiAgfVxuXG4gIHR5cGUgU2hhcGVTdGF0ZSA9IFN0YXRlT2Y8dHlwZW9mIHNoYXBlPlxuICB0eXBlIFNoYXBlQWN0aW9uID0gQWN0aW9uT2Y8dHlwZW9mIHNoYXBlPlxuXG4gIC8vIFx1NUMwNlx1NjMwOSBUYWcgXHU1MjA2XHU3RUM0XHU3Njg0IHJlZHVjZXIgXHU2NjIwXHU1QzA0XHU0RTNBXHU3QjgwXHU1MzU1XHU3Njg0IGBfdGFnIC0+IChzdGF0ZSwgYWN0aW9uKSA9PiBzdGF0ZWAgXHU1RjYyXHU2MDAxXHVGRjBDXHU0RjlCIFJ1bnRpbWUgXHU0RjdGXHU3NTI4XHUzMDAyXG4gIGNvbnN0IHJlZHVjZXJzID1cbiAgICBkZWYucmVkdWNlcnMgJiZcbiAgICAoT2JqZWN0LmZyb21FbnRyaWVzKFxuICAgICAgT2JqZWN0LmVudHJpZXMoZGVmLnJlZHVjZXJzKS5tYXAoKFt0YWcsIHJlZHVjZXJdKSA9PiBbXG4gICAgICAgIHRhZyxcbiAgICAgICAgKHN0YXRlOiBTaGFwZVN0YXRlLCBhY3Rpb246IFNoYXBlQWN0aW9uKSA9PlxuICAgICAgICAgIC8vIFx1OEZEOVx1OTFDQ1x1NEY5RFx1OEQ1NiBgX3RhZ2AgXHU3Njg0XHU4RkQwXHU4ODRDXHU2NUY2XHU3RUE2XHU1QjlBXHVGRjFBXHU1M0VBXHU2NzA5XHU1MzM5XHU5MTREXHU1RjUzXHU1MjREIHRhZyBcdTc2ODQgQWN0aW9uIFx1NEYxQVx1NEVBNFx1N0VEOVx1NUJGOVx1NUU5NCByZWR1Y2VyXHUzMDAyXG4gICAgICAgICAgKHJlZHVjZXIgYXMgYW55KShcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgYWN0aW9uIGFzIHtcbiAgICAgICAgICAgICAgcmVhZG9ubHkgX3RhZzogc3RyaW5nXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHBheWxvYWQ6IHVua25vd25cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgKSBhcyBTaGFwZVN0YXRlLFxuICAgICAgXSksXG4gICAgKSBhcyBSZWNvcmQ8c3RyaW5nLCAoc3RhdGU6IFNoYXBlU3RhdGUsIGFjdGlvbjogU2hhcGVBY3Rpb24pID0+IFNoYXBlU3RhdGU+KVxuXG4gIGNvbnN0IHRhZyA9IENvbnRleHQuR2VuZXJpY1RhZzxcbiAgICBhbnksXG4gICAgaW1wb3J0KFwiLi9jb3JlL21vZHVsZS5qc1wiKS5Nb2R1bGVSdW50aW1lPFN0YXRlT2Y8dHlwZW9mIHNoYXBlPiwgQWN0aW9uT2Y8dHlwZW9mIHNoYXBlPj5cbiAgPihgQGxvZ2l4L01vZHVsZS8ke2lkfWApXG5cbiAgY29uc3QgbW9kdWxlSW5zdGFuY2UgPSBPYmplY3QuYXNzaWduKHRhZywge1xuICAgIF9raW5kOiBcIk1vZHVsZVwiIGFzIGNvbnN0LFxuICAgIGlkLFxuICAgIHNoYXBlLFxuICAgIHN0YXRlU2NoZW1hOiBzaGFwZS5zdGF0ZVNjaGVtYSxcbiAgICBhY3Rpb25TY2hlbWE6IHNoYXBlLmFjdGlvblNjaGVtYSxcbiAgICAvKipcbiAgICAgKiBcdTRFM0FcdTVGNTNcdTUyNEQgTW9kdWxlIFx1Njc4NFx1OTAyMFx1NEUwMFx1NkJCNSBMb2dpYyBcdTdBMEJcdTVFOEZcdUZGMUFcbiAgICAgKiAtIFx1NTcyOFx1OEZEMFx1ODg0Q1x1NjVGNlx1NEVDRSBDb250ZXh0IFx1NEUyRFx1NTNENlx1NTFGQVx1ODFFQVx1OEVBQlx1NzY4NCBNb2R1bGVSdW50aW1lXHVGRjFCXG4gICAgICogLSBcdTU3RkFcdTRFOEUgUnVudGltZSBcdTY3ODRcdTkwMjAgQm91bmRBcGlcdUZGMUJcbiAgICAgKiAtIFx1NUMwNiBCb3VuZEFwaSBcdTRFQTRcdTdFRDlcdThDMDNcdTc1MjhcdTY1QjlcdTY3ODRcdTkwMjBcdTRFMUFcdTUyQTEgTG9naWNcdTMwMDJcbiAgICAgKi9cbiAgICBsb2dpYzogPFIgPSB1bmtub3duLCBFID0gbmV2ZXI+KFxuICAgICAgYnVpbGQ6IChcbiAgICAgICAgYXBpOiBpbXBvcnQoXCIuL2NvcmUvbW9kdWxlLmpzXCIpLkJvdW5kQXBpPHR5cGVvZiBzaGFwZSwgUj5cbiAgICAgICkgPT4gTW9kdWxlTG9naWM8dHlwZW9mIHNoYXBlLCBSLCBFPlxuICAgICk6IE1vZHVsZUxvZ2ljPHR5cGVvZiBzaGFwZSwgUiwgRT4gPT4ge1xuICAgICAgY29uc3QgcGhhc2VSZWY6IHsgY3VycmVudDogXCJzZXR1cFwiIHwgXCJydW5cIiB9ID0geyBjdXJyZW50OiBcInNldHVwXCIgfVxuICAgICAgY29uc3QgcGhhc2VTZXJ2aWNlOiBMb2dpY0RpYWdub3N0aWNzLkxvZ2ljUGhhc2VTZXJ2aWNlID0ge1xuICAgICAgICBnZXQgY3VycmVudCgpIHtcbiAgICAgICAgICByZXR1cm4gcGhhc2VSZWYuY3VycmVudFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICAgY29uc3QgbG9naWNFZmZlY3QgPSBFZmZlY3QuZ2VuKGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGNvbnN0IHJ1bnRpbWUgPSB5aWVsZCogdGFnXG4gICAgICAgIGNvbnN0IGFwaSA9IEJvdW5kQXBpUnVudGltZS5tYWtlPHR5cGVvZiBzaGFwZSwgUj4oc2hhcGUsIHJ1bnRpbWUsIHtcbiAgICAgICAgICBnZXRQaGFzZTogKCkgPT4gcGhhc2VSZWYuY3VycmVudCxcbiAgICAgICAgICBwaGFzZVNlcnZpY2UsXG4gICAgICAgICAgbW9kdWxlSWQ6IGlkLFxuICAgICAgICB9KVxuXG4gICAgICAgIGxldCBidWlsdDogdW5rbm93blxuICAgICAgICB0cnkge1xuICAgICAgICAgIGJ1aWx0ID0gYnVpbGQoYXBpKVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAvLyBcdTVDMDZcdTU0MENcdTZCNjVcdTYyOUJcdTUxRkFcdTc2ODQgTG9naWNQaGFzZUVycm9yIFx1OEY2Q1x1NjM2Mlx1NEUzQSBFZmZlY3QuZmFpbFx1RkYwQ1x1OTA3Rlx1NTE0RCBydW5TeW5jIFx1ODlDNlx1NEUzQVx1MjAxQ1x1NUYwMlx1NkI2NVx1NjcyQVx1NTFCMyBGaWJlclx1MjAxRFxuICAgICAgICAgIGlmICgoZXJyIGFzIGFueSk/Ll90YWcgPT09IFwiTG9naWNQaGFzZUVycm9yXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB5aWVsZCogRWZmZWN0LmZhaWwoZXJyIGFzIGFueSlcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKGJ1aWx0IGFzIGFueSk/Ll9fbG9naWNQbGFuID09PSB0cnVlKSB7XG4gICAgICAgICAgcmV0dXJuIHlpZWxkKiAoYnVpbHQgYXMgRWZmZWN0LkVmZmVjdDxhbnksIGFueSwgYW55PilcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlzTG9naWNQbGFuID0gKFxuICAgICAgICAgIHZhbHVlOiB1bmtub3duXG4gICAgICAgICk6IHZhbHVlIGlzIGltcG9ydChcIi4vY29yZS9tb2R1bGUuanNcIikuTG9naWNQbGFuPHR5cGVvZiBzaGFwZSwgUiwgRT4gPT5cbiAgICAgICAgICBCb29sZWFuKFxuICAgICAgICAgICAgdmFsdWUgJiZcbiAgICAgICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgICAgICAgXCJzZXR1cFwiIGluICh2YWx1ZSBhcyBhbnkpICYmXG4gICAgICAgICAgICBcInJ1blwiIGluICh2YWx1ZSBhcyBhbnkpXG4gICAgICAgICAgKVxuXG4gICAgICAgIGNvbnN0IHBsYW4gPSBpc0xvZ2ljUGxhbihidWlsdClcbiAgICAgICAgICA/IGJ1aWx0XG4gICAgICAgICAgOiAoe1xuICAgICAgICAgICAgc2V0dXA6IEVmZmVjdC52b2lkLFxuICAgICAgICAgICAgcnVuOiBidWlsdCBhcyBFZmZlY3QuRWZmZWN0PGFueSwgYW55LCBhbnk+LFxuICAgICAgICAgIH0gc2F0aXNmaWVzIGltcG9ydChcIi4vY29yZS9tb2R1bGUuanNcIikuTG9naWNQbGFuPHR5cGVvZiBzaGFwZSwgUiwgRT4pXG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocGxhbiwgeyBfX3BoYXNlUmVmOiBwaGFzZVJlZiB9KVxuICAgICAgfSlcblxuICAgICAgOyhsb2dpY0VmZmVjdCBhcyBhbnkpLl9fbG9naWNQbGFuID0gdHJ1ZVxuICAgICAgOyhsb2dpY0VmZmVjdCBhcyBhbnkpLl9fcGhhc2VSZWYgPSBwaGFzZVJlZlxuICAgICAgcmV0dXJuIGxvZ2ljRWZmZWN0XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIGxpdmVcdUZGMUFcdTdFRDlcdTVCOUFcdTUyMURcdTU5Q0JcdTcyQjZcdTYwMDFcdTRFMEVcdTRFMDBcdTdFQzQgTG9naWNcdUZGMENcdTY3ODRcdTkwMjBcdTVFMjYgU2NvcGUgXHU3Njg0IE1vZHVsZVJ1bnRpbWUgTGF5ZXJcdTMwMDJcbiAgICAgKlxuICAgICAqIEVudiBcdTdFQTZcdTVCOUFcdUZGMUFcbiAgICAgKiAtIFIgXHU4ODY4XHU3OTNBIExvZ2ljIFx1OEZEMFx1ODg0Q1x1NjI0MFx1OTcwMFx1NzY4NFx1OTg5RFx1NTkxNlx1NzNBRlx1NTg4M1x1RkYwOFNlcnZpY2UgLyBcdTVFNzNcdTUzRjBcdTdCNDlcdUZGMDlcdUZGMUJcbiAgICAgKiAtIE1vZHVsZVJ1bnRpbWUgXHU2NzJDXHU4RUFCXHU1M0VBXHU0RjlEXHU4RDU2IFNjb3BlLlNjb3BlXHVGRjBDXHU3NTMxIExheWVyLnNjb3BlZCBcdTdCQTFcdTc0MDZcdTMwMDJcbiAgICAgKi9cbiAgICBsaXZlOiA8UiA9IG5ldmVyLCBFID0gbmV2ZXI+KFxuICAgICAgaW5pdGlhbDogU3RhdGVPZjx0eXBlb2Ygc2hhcGU+LFxuICAgICAgLi4ubG9naWNzOiBBcnJheTxNb2R1bGVMb2dpYzx0eXBlb2Ygc2hhcGUsIFIsIEU+PlxuICAgICAgKTogTGF5ZXIuTGF5ZXI8XG4gICAgICAgIGltcG9ydChcIi4vY29yZS9tb2R1bGUuanNcIikuTW9kdWxlUnVudGltZTxcbiAgICAgICAgICBTdGF0ZU9mPHR5cGVvZiBzaGFwZT4sXG4gICAgICAgICAgQWN0aW9uT2Y8dHlwZW9mIHNoYXBlPlxuICAgICAgICA+LFxuICAgICAgICBFLFxuICAgICAgICBSXG4gICAgICA+ID0+XG4gICAgICBMYXllci5zY29wZWQoXG4gICAgICAgIHRhZyxcbiAgICAgICAgTW9kdWxlUnVudGltZUltcGwubWFrZTxTdGF0ZU9mPHR5cGVvZiBzaGFwZT4sIEFjdGlvbk9mPHR5cGVvZiBzaGFwZT4sIFI+KFxuICAgICAgICAgIGluaXRpYWwsXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGFnLFxuICAgICAgICAgICAgbG9naWNzOiBsb2dpY3MgYXMgUmVhZG9ubHlBcnJheTxFZmZlY3QuRWZmZWN0PGFueSwgYW55LCBhbnk+PixcbiAgICAgICAgICAgIG1vZHVsZUlkOiBpZCxcbiAgICAgICAgICAgIHJlZHVjZXJzLFxuICAgICAgICAgIH0sXG4gICAgICAgICksXG4gICAgICApIGFzIExheWVyLkxheWVyPFxuICAgICAgICBpbXBvcnQoXCIuL2NvcmUvbW9kdWxlLmpzXCIpLk1vZHVsZVJ1bnRpbWU8XG4gICAgICAgICAgU3RhdGVPZjx0eXBlb2Ygc2hhcGU+LFxuICAgICAgICAgIEFjdGlvbk9mPHR5cGVvZiBzaGFwZT5cbiAgICAgICAgPixcbiAgICAgICAgRSxcbiAgICAgICAgUlxuICAgICAgPixcblxuICAgIC8qKlxuICAgICAqIGltcGxlbWVudFx1RkYxQVx1NTdGQVx1NEU4RSBNb2R1bGUgXHU1QjlBXHU0RTQ5ICsgXHU1MjFEXHU1OUNCXHU3MkI2XHU2MDAxICsgTG9naWMgXHU5NkM2XHU1NDA4XHVGRjBDXHU3NTFGXHU2MjEwIE1vZHVsZUltcGwgXHU4NEREXHU1NkZFXHUzMDAyXG4gICAgICpcbiAgICAgKiAtIFIgXHU4ODY4XHU3OTNBIExvZ2ljIFx1NjI0MFx1OTcwMFx1NzY4NCBFbnYgXHU3QzdCXHU1NzhCXHVGRjFCXG4gICAgICogLSBcdThGRDRcdTU2REVcdTc2ODQgTW9kdWxlSW1wbC5sYXllciBcdTRGMUFcdTY0M0FcdTVFMjYgUiBcdTRGNUNcdTRFM0FcdThGOTNcdTUxNjVcdTczQUZcdTU4ODNcdUZGMUJcbiAgICAgKiAtIFx1OTAxQVx1OEZDNyB3aXRoTGF5ZXIvd2l0aExheWVycyBcdTUzRUZcdTRFRTVcdTkwMTBcdTZCNjVcdTVDMDYgUiBcdTY1MzZcdTY1NUJcdTRFM0FcdTY2RjRcdTUxNzdcdTRGNTNcdTc2ODQgRW52XHVGRjA4XHU3NTFBXHU4MUYzIG5ldmVyXHVGRjA5XHUzMDAyXG4gICAgICovXG4gICAgaW1wbGVtZW50OiA8UiA9IG5ldmVyPihjb25maWc6IHtcbiAgICAgIGluaXRpYWw6IFN0YXRlT2Y8dHlwZW9mIHNoYXBlPlxuICAgICAgbG9naWNzPzogQXJyYXk8TW9kdWxlTG9naWM8dHlwZW9mIHNoYXBlLCBSLCBuZXZlcj4+XG4gICAgICBpbXBvcnRzPzogUmVhZG9ubHlBcnJheTxcbiAgICAgICAgTGF5ZXIuTGF5ZXI8YW55LCBhbnksIGFueT4gfCBNb2R1bGVJbXBsPGFueSwgQW55TW9kdWxlU2hhcGUsIGFueT5cbiAgICAgID5cbiAgICAgIC8qKlxuICAgICAgICogcHJvY2Vzc2VzXHVGRjFBXHU0RTBFXHU4QkU1IE1vZHVsZSBcdTVCOUVcdTczQjBcdTdFRDFcdTVCOUFcdTc2ODRcdTRFMDBcdTdFQzRcdTk1N0ZcdTY3MUZcdTZENDFcdTdBMEJcdUZGMDhcdTU0MkIgTGlua1x1RkYwOVx1MzAwMlxuICAgICAgICpcbiAgICAgICAqIC0gXHU4RkQ5XHU0RTlCIEVmZmVjdCBcdTRGMUFcdTU3MjhcdThGRDBcdTg4NENcdTY1RjZcdTVCQjlcdTU2NjhcdUZGMDhcdTRGOEJcdTU5ODIgUnVudGltZS5tYWtlXHVGRjA5XHU0RTJEXHU4OEFCXHU3RURGXHU0RTAwIGZvcmtcdUZGMUJcbiAgICAgICAqIC0gXHU3QzdCXHU1NzhCXHU0RTBBXHU0RjdGXHU3NTI4XHU1QkJEXHU2NzdFXHU3Njg0IEUvUiBcdTRFRTVcdTRGQkZcdTdFQzRcdTU0MDhcdTU0MDRcdTc5Q0RcdThERThcdTZBMjFcdTU3NTdcdTdGMTZcdTYzOTJcdTkwM0JcdThGOTFcdUZGMUJcbiAgICAgICAqIC0gXHU0RTFBXHU1MkExXHU0RUUzXHU3ODAxXHU5MDFBXHU1RTM4XHU5MDFBXHU4RkM3IExpbmsubWFrZSBcdTY3ODRcdTkwMjBcdThGRDlcdTRFOUJcdTZENDFcdTdBMEJcdTMwMDJcbiAgICAgICAqL1xuICAgICAgcHJvY2Vzc2VzPzogUmVhZG9ubHlBcnJheTxFZmZlY3QuRWZmZWN0PHZvaWQsIGFueSwgYW55Pj5cbiAgICB9KTogTW9kdWxlSW1wbDxcbiAgICAgIElkLFxuICAgICAgICBNb2R1bGVTaGFwZTxcbiAgICAgICAgICBTU2NoZW1hLFxuICAgICAgICAgIFNjaGVtYS5TY2hlbWE8e1xuICAgICAgICAgICAgW0sgaW4ga2V5b2YgQU1hcF06IHtcbiAgICAgICAgICAgICAgcmVhZG9ubHkgX3RhZzogS1xuICAgICAgICAgICAgICByZWFkb25seSBwYXlsb2FkOiBTY2hlbWEuU2NoZW1hLlR5cGU8QU1hcFtLXT5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9W2tleW9mIEFNYXBdPixcbiAgICAgICAgICBBTWFwXG4gICAgICAgID4sXG4gICAgICAgIFJcbiAgICAgID4gPT4ge1xuICAgICAgY29uc3QgYmFzZUxheWVyID0gbW9kdWxlSW5zdGFuY2UubGl2ZTxSLCBuZXZlcj4oXG4gICAgICAgIGNvbmZpZy5pbml0aWFsLFxuICAgICAgICAuLi4oY29uZmlnLmxvZ2ljcyB8fCBbXSksXG4gICAgICApXG5cbiAgICAgIGNvbnN0IHByb2Nlc3NlcyA9IGNvbmZpZy5wcm9jZXNzZXMgPz8gW11cblxuICAgICAgY29uc3QgbWFrZUltcGxXaXRoTGF5ZXIgPSAoXG4gICAgICAgIGxheWVyOiBMYXllci5MYXllcjxcbiAgICAgICAgICBpbXBvcnQoXCIuL2NvcmUvbW9kdWxlLmpzXCIpLk1vZHVsZVJ1bnRpbWU8XG4gICAgICAgICAgICBTdGF0ZU9mPHR5cGVvZiBzaGFwZT4sXG4gICAgICAgICAgICBBY3Rpb25PZjx0eXBlb2Ygc2hhcGU+XG4gICAgICAgICAgPixcbiAgICAgICAgICBuZXZlcixcbiAgICAgICAgICBhbnlcbiAgICAgICAgPixcbiAgICAgICk6IE1vZHVsZUltcGw8XG4gICAgICAgIElkLFxuICAgICAgICBNb2R1bGVTaGFwZTxcbiAgICAgICAgICBTU2NoZW1hLFxuICAgICAgICAgIFNjaGVtYS5TY2hlbWE8e1xuICAgICAgICAgICAgW0sgaW4ga2V5b2YgQU1hcF06IHtcbiAgICAgICAgICAgICAgcmVhZG9ubHkgX3RhZzogS1xuICAgICAgICAgICAgICByZWFkb25seSBwYXlsb2FkOiBTY2hlbWEuU2NoZW1hLlR5cGU8QU1hcFtLXT5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9W2tleW9mIEFNYXBdPixcbiAgICAgICAgICBBTWFwXG4gICAgICAgID4sXG4gICAgICAgIGFueVxuICAgICAgPiA9PiAoe1xuICAgICAgICBfdGFnOiBcIk1vZHVsZUltcGxcIixcbiAgICAgICAgbW9kdWxlOiBtb2R1bGVJbnN0YW5jZSBhcyB1bmtub3duIGFzIE1vZHVsZUluc3RhbmNlPFxuICAgICAgICAgIElkLFxuICAgICAgICAgIE1vZHVsZVNoYXBlPFxuICAgICAgICAgICAgU1NjaGVtYSxcbiAgICAgICAgICAgIFNjaGVtYS5TY2hlbWE8e1xuICAgICAgICAgICAgICBbSyBpbiBrZXlvZiBBTWFwXToge1xuICAgICAgICAgICAgICAgIHJlYWRvbmx5IF90YWc6IEtcbiAgICAgICAgICAgICAgICByZWFkb25seSBwYXlsb2FkOiBTY2hlbWEuU2NoZW1hLlR5cGU8QU1hcFtLXT5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVtrZXlvZiBBTWFwXT4sXG4gICAgICAgICAgICBBTWFwXG4gICAgICAgICAgPlxuICAgICAgICA+LFxuICAgICAgICBsYXllcixcbiAgICAgICAgcHJvY2Vzc2VzLFxuICAgICAgICB3aXRoTGF5ZXI6IChcbiAgICAgICAgICBleHRyYTogTGF5ZXIuTGF5ZXI8YW55LCBuZXZlciwgYW55PlxuICAgICAgICApOiBNb2R1bGVJbXBsPFxuICAgICAgICAgIElkLFxuICAgICAgICAgIE1vZHVsZVNoYXBlPFxuICAgICAgICAgICAgU1NjaGVtYSxcbiAgICAgICAgICAgIFNjaGVtYS5TY2hlbWE8e1xuICAgICAgICAgICAgICBbSyBpbiBrZXlvZiBBTWFwXToge1xuICAgICAgICAgICAgICAgIHJlYWRvbmx5IF90YWc6IEtcbiAgICAgICAgICAgICAgICByZWFkb25seSBwYXlsb2FkOiBTY2hlbWEuU2NoZW1hLlR5cGU8QU1hcFtLXT5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVtrZXlvZiBBTWFwXT4sXG4gICAgICAgICAgICBBTWFwXG4gICAgICAgICAgPixcbiAgICAgICAgICBhbnlcbiAgICAgICAgPiA9PiB7XG4gICAgICAgICAgY29uc3QgcHJvdmlkZWQgPSAobGF5ZXIgYXMgTGF5ZXIuTGF5ZXI8XG4gICAgICAgICAgICBpbXBvcnQoXCIuL2NvcmUvbW9kdWxlLmpzXCIpLk1vZHVsZVJ1bnRpbWU8XG4gICAgICAgICAgICAgIFN0YXRlT2Y8dHlwZW9mIHNoYXBlPixcbiAgICAgICAgICAgICAgQWN0aW9uT2Y8dHlwZW9mIHNoYXBlPlxuICAgICAgICAgICAgPixcbiAgICAgICAgICAgIG5ldmVyLFxuICAgICAgICAgICAgYW55XG4gICAgICAgICAgPikucGlwZShcbiAgICAgICAgICAgIExheWVyLnByb3ZpZGUoXG4gICAgICAgICAgICAgIGV4dHJhIGFzIExheWVyLkxheWVyPGFueSwgbmV2ZXIsIGFueT5cbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG5cbiAgICAgICAgICBjb25zdCBtZXJnZWQgPSBMYXllci5tZXJnZUFsbChcbiAgICAgICAgICAgIHByb3ZpZGVkLFxuICAgICAgICAgICAgZXh0cmEgYXMgTGF5ZXIuTGF5ZXI8YW55LCBuZXZlciwgYW55PlxuICAgICAgICAgICkgYXMgTGF5ZXIuTGF5ZXI8XG4gICAgICAgICAgICBpbXBvcnQoXCIuL2NvcmUvbW9kdWxlLmpzXCIpLk1vZHVsZVJ1bnRpbWU8XG4gICAgICAgICAgICAgIFN0YXRlT2Y8dHlwZW9mIHNoYXBlPixcbiAgICAgICAgICAgICAgQWN0aW9uT2Y8dHlwZW9mIHNoYXBlPlxuICAgICAgICAgICAgPixcbiAgICAgICAgICAgIG5ldmVyLFxuICAgICAgICAgICAgYW55XG4gICAgICAgICAgPlxuXG4gICAgICAgICAgcmV0dXJuIG1ha2VJbXBsV2l0aExheWVyKG1lcmdlZClcbiAgICAgICAgfSxcbiAgICAgICAgd2l0aExheWVyczogKFxuICAgICAgICAgIC4uLmV4dHJhczogUmVhZG9ubHlBcnJheTxMYXllci5MYXllcjxhbnksIG5ldmVyLCBhbnk+PlxuICAgICAgICApOiBNb2R1bGVJbXBsPFxuICAgICAgICAgIElkLFxuICAgICAgICAgIE1vZHVsZVNoYXBlPFxuICAgICAgICAgICAgU1NjaGVtYSxcbiAgICAgICAgICAgIFNjaGVtYS5TY2hlbWE8e1xuICAgICAgICAgICAgICBbSyBpbiBrZXlvZiBBTWFwXToge1xuICAgICAgICAgICAgICAgIHJlYWRvbmx5IF90YWc6IEtcbiAgICAgICAgICAgICAgICByZWFkb25seSBwYXlsb2FkOiBTY2hlbWEuU2NoZW1hLlR5cGU8QU1hcFtLXT5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVtrZXlvZiBBTWFwXT4sXG4gICAgICAgICAgICBBTWFwXG4gICAgICAgICAgPixcbiAgICAgICAgICBhbnlcbiAgICAgICAgPiA9PlxuICAgICAgICAgIGV4dHJhcy5yZWR1Y2U8TW9kdWxlSW1wbDxcbiAgICAgICAgICAgIElkLFxuICAgICAgICAgICAgTW9kdWxlU2hhcGU8XG4gICAgICAgICAgICAgIFNTY2hlbWEsXG4gICAgICAgICAgICAgIFNjaGVtYS5TY2hlbWE8e1xuICAgICAgICAgICAgICAgIFtLIGluIGtleW9mIEFNYXBdOiB7XG4gICAgICAgICAgICAgICAgICByZWFkb25seSBfdGFnOiBLXG4gICAgICAgICAgICAgICAgICByZWFkb25seSBwYXlsb2FkOiBTY2hlbWEuU2NoZW1hLlR5cGU8QU1hcFtLXT5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1ba2V5b2YgQU1hcF0+LFxuICAgICAgICAgICAgICBBTWFwXG4gICAgICAgICAgICA+LFxuICAgICAgICAgICAgYW55XG4gICAgICAgICAgPj4oXG4gICAgICAgICAgICAoaW1wbEFjYywgZXh0cmEpID0+IGltcGxBY2Mud2l0aExheWVyKGV4dHJhKSxcbiAgICAgICAgICAgIG1ha2VJbXBsV2l0aExheWVyKFxuICAgICAgICAgICAgICBsYXllciBhcyBMYXllci5MYXllcjxcbiAgICAgICAgICAgICAgICBpbXBvcnQoXCIuL2NvcmUvbW9kdWxlLmpzXCIpLk1vZHVsZVJ1bnRpbWU8XG4gICAgICAgICAgICAgICAgICBTdGF0ZU9mPHR5cGVvZiBzaGFwZT4sXG4gICAgICAgICAgICAgICAgICBBY3Rpb25PZjx0eXBlb2Ygc2hhcGU+XG4gICAgICAgICAgICAgICAgPixcbiAgICAgICAgICAgICAgICBuZXZlcixcbiAgICAgICAgICAgICAgICBhbnlcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgKVxuICAgICAgICAgICksXG4gICAgICB9KVxuXG4gICAgICAvLyBcdTRFQ0UgYmFzZUxheWVyIFx1NUYwMFx1NTlDQlx1RkYwQ1x1NEY5RFx1NkIyMVx1NTNFMFx1NTJBMCBpbXBvcnRzXHVGRjA4TGF5ZXIgXHU2MjE2XHU1MTc2XHU0RUQ2IE1vZHVsZUltcGwgXHU3Njg0IGxheWVyXHVGRjA5XG4gICAgICBjb25zdCBpbml0aWFsSW1wbCA9IG1ha2VJbXBsV2l0aExheWVyKFxuICAgICAgICBiYXNlTGF5ZXIgYXMgTGF5ZXIuTGF5ZXI8XG4gICAgICAgICAgaW1wb3J0KFwiLi9jb3JlL21vZHVsZS5qc1wiKS5Nb2R1bGVSdW50aW1lPFxuICAgICAgICAgICAgU3RhdGVPZjx0eXBlb2Ygc2hhcGU+LFxuICAgICAgICAgICAgQWN0aW9uT2Y8dHlwZW9mIHNoYXBlPlxuICAgICAgICAgID4sXG4gICAgICAgICAgbmV2ZXIsXG4gICAgICAgICAgYW55XG4gICAgICAgID5cbiAgICAgIClcblxuICAgICAgY29uc3QgaW1wb3J0cyA9IGNvbmZpZy5pbXBvcnRzID8/IFtdXG5cbiAgICAgIGNvbnN0IGZpbmFsSW1wbCA9IGltcG9ydHMucmVkdWNlPE1vZHVsZUltcGw8XG4gICAgICAgIElkLFxuICAgICAgICBNb2R1bGVTaGFwZTxcbiAgICAgICAgICBTU2NoZW1hLFxuICAgICAgICAgIFNjaGVtYS5TY2hlbWE8e1xuICAgICAgICAgICAgW0sgaW4ga2V5b2YgQU1hcF06IHtcbiAgICAgICAgICAgICAgcmVhZG9ubHkgX3RhZzogS1xuICAgICAgICAgICAgICByZWFkb25seSBwYXlsb2FkOiBTY2hlbWEuU2NoZW1hLlR5cGU8QU1hcFtLXT5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9W2tleW9mIEFNYXBdPixcbiAgICAgICAgICBBTWFwXG4gICAgICAgID4sXG4gICAgICAgIGFueVxuICAgICAgPj4oKGltcGxBY2MsIGl0ZW0pID0+IHtcbiAgICAgICAgY29uc3QgbGF5ZXIgPVxuICAgICAgICAgIChpdGVtIGFzIE1vZHVsZUltcGw8YW55LCBBbnlNb2R1bGVTaGFwZSwgYW55PikuX3RhZyA9PT0gXCJNb2R1bGVJbXBsXCJcbiAgICAgICAgICAgID8gKGl0ZW0gYXMgTW9kdWxlSW1wbDxhbnksIEFueU1vZHVsZVNoYXBlLCBhbnk+KS5sYXllclxuICAgICAgICAgICAgOiAoaXRlbSBhcyBMYXllci5MYXllcjxhbnksIGFueSwgYW55PilcblxuICAgICAgICByZXR1cm4gaW1wbEFjYy53aXRoTGF5ZXIobGF5ZXIgYXMgTGF5ZXIuTGF5ZXI8YW55LCBuZXZlciwgYW55PilcbiAgICAgIH0sIGluaXRpYWxJbXBsKVxuXG4gICAgICByZXR1cm4gZmluYWxJbXBsXG4gICAgfSxcbiAgfSlcblxuICByZXR1cm4gbW9kdWxlSW5zdGFuY2UgYXMgTW9kdWxlSW5zdGFuY2U8XG4gICAgSWQsXG4gICAgTW9kdWxlU2hhcGU8XG4gICAgICBTU2NoZW1hLFxuICAgICAgU2NoZW1hLlNjaGVtYTx7XG4gICAgICAgIFtLIGluIGtleW9mIEFNYXBdOiB7XG4gICAgICAgICAgcmVhZG9ubHkgX3RhZzogS1xuICAgICAgICAgIHJlYWRvbmx5IHBheWxvYWQ6IFNjaGVtYS5TY2hlbWEuVHlwZTxBTWFwW0tdPlxuICAgICAgICB9XG4gICAgICB9W2tleW9mIEFNYXBdPixcbiAgICAgIEFNYXBcbiAgICA+XG4gID5cbn1cbiIsICJpbXBvcnQge1xuICBFZmZlY3QsXG4gIFN0cmVhbSxcbiAgU3Vic2NyaXB0aW9uUmVmLFxuICBQdWJTdWIsXG4gIFNjb3BlLFxuICBDb250ZXh0LFxuICBSZWYsXG4gIEZpYmVyLFxuICBFeGl0LFxuICBDYXVzZSxcbn0gZnJvbSBcImVmZmVjdFwiXG5pbXBvcnQgdHlwZSB7IExvZ2ljUGxhbiwgTW9kdWxlUnVudGltZSBhcyBQdWJsaWNNb2R1bGVSdW50aW1lIH0gZnJvbSBcIi4vY29yZS9tb2R1bGUuanNcIlxuaW1wb3J0ICogYXMgTGlmZWN5Y2xlIGZyb20gXCIuL0xpZmVjeWNsZS5qc1wiXG5pbXBvcnQgKiBhcyBEZWJ1ZyBmcm9tIFwiLi9jb3JlL0RlYnVnU2luay5qc1wiXG5pbXBvcnQgKiBhcyBSZWR1Y2VyRGlhZ25vc3RpY3MgZnJvbSBcIi4vY29yZS9SZWR1Y2VyRGlhZ25vc3RpY3MuanNcIlxuaW1wb3J0ICogYXMgTGlmZWN5Y2xlRGlhZ25vc3RpY3MgZnJvbSBcIi4vY29yZS9MaWZlY3ljbGVEaWFnbm9zdGljcy5qc1wiXG5pbXBvcnQgKiBhcyBMb2dpY0RpYWdub3N0aWNzIGZyb20gXCIuL2NvcmUvTG9naWNEaWFnbm9zdGljcy5qc1wiXG5pbXBvcnQgeyBnbG9iYWxMb2dpY1BoYXNlUmVmIH0gZnJvbSBcIi4vQm91bmRBcGlSdW50aW1lLmpzXCJcblxuLyoqXG4gKiBcdTUxNjhcdTVDNDBcdThGRDBcdTg4NENcdTY1RjZcdTZDRThcdTUxOENcdTg4NjhcdUZGMUFcbiAqIC0ga2V5XHVGRjFBTW9kdWxlIFRhZ1x1RkYwOE1vZHVsZUluc3RhbmNlIFx1NjcyQ1x1OEVBQlx1RkYwOVx1RkYxQlxuICogLSB2YWx1ZVx1RkYxQVx1NUJGOVx1NUU5NFx1NzY4NCBNb2R1bGVSdW50aW1lIFx1NUI5RVx1NEY4Qlx1MzAwMlxuICpcbiAqIFx1NEVDNVx1NzUyOFx1NEU4RVx1OEZEMFx1ODg0Q1x1NjVGNlx1NTE4NVx1OTBFOFx1RkYwOFx1NEY4Qlx1NTk4MiAkLnVzZVJlbW90ZSAvIExpbmsgXHU3QjQ5XHU4REU4XHU2QTIxXHU1NzU3XHU4MEZEXHU1MjlCXHVGRjA5XHVGRjBDXG4gKiBcdTRFMERcdTRGNUNcdTRFM0FcdTVCRjlcdTU5MTZcdTZCNjNcdTVGMEYgQVBJIFx1NjZCNFx1OTczMlx1MzAwMlxuICovXG5jb25zdCBydW50aW1lUmVnaXN0cnkgPSBuZXcgV2Vha01hcDxcbiAgQ29udGV4dC5UYWc8YW55LCBQdWJsaWNNb2R1bGVSdW50aW1lPGFueSwgYW55Pj4sXG4gIFB1YmxpY01vZHVsZVJ1bnRpbWU8YW55LCBhbnk+XG4+KClcblxuZXhwb3J0IGNvbnN0IHJlZ2lzdGVyUnVudGltZSA9IDxTLCBBPihcbiAgdGFnOiBDb250ZXh0LlRhZzxhbnksIFB1YmxpY01vZHVsZVJ1bnRpbWU8UywgQT4+LFxuICBydW50aW1lOiBQdWJsaWNNb2R1bGVSdW50aW1lPFMsIEE+XG4pOiB2b2lkID0+IHtcbiAgcnVudGltZVJlZ2lzdHJ5LnNldChcbiAgICB0YWcgYXMgQ29udGV4dC5UYWc8YW55LCBQdWJsaWNNb2R1bGVSdW50aW1lPGFueSwgYW55Pj4sXG4gICAgcnVudGltZSBhcyBQdWJsaWNNb2R1bGVSdW50aW1lPGFueSwgYW55PlxuICApXG59XG5cbmV4cG9ydCBjb25zdCB1bnJlZ2lzdGVyUnVudGltZSA9IChcbiAgdGFnOiBDb250ZXh0LlRhZzxhbnksIFB1YmxpY01vZHVsZVJ1bnRpbWU8YW55LCBhbnk+PlxuKTogdm9pZCA9PiB7XG4gIHJ1bnRpbWVSZWdpc3RyeS5kZWxldGUodGFnKVxufVxuXG5leHBvcnQgY29uc3QgZ2V0UmVnaXN0ZXJlZFJ1bnRpbWUgPSA8UywgQT4oXG4gIHRhZzogQ29udGV4dC5UYWc8YW55LCBQdWJsaWNNb2R1bGVSdW50aW1lPFMsIEE+PlxuKTogUHVibGljTW9kdWxlUnVudGltZTxTLCBBPiB8IHVuZGVmaW5lZCA9PlxuICBydW50aW1lUmVnaXN0cnkuZ2V0KFxuICAgIHRhZyBhcyBDb250ZXh0LlRhZzxhbnksIFB1YmxpY01vZHVsZVJ1bnRpbWU8YW55LCBhbnk+PlxuICApIGFzIFB1YmxpY01vZHVsZVJ1bnRpbWU8UywgQT4gfCB1bmRlZmluZWRcblxuZXhwb3J0IGludGVyZmFjZSBNb2R1bGVSdW50aW1lT3B0aW9uczxTLCBBLCBSID0gbmV2ZXI+IHtcbiAgcmVhZG9ubHkgdGFnPzogQ29udGV4dC5UYWc8YW55LCBQdWJsaWNNb2R1bGVSdW50aW1lPFMsIEE+PlxuICByZWFkb25seSBsb2dpY3M/OiBSZWFkb25seUFycmF5PFxuICAgIEVmZmVjdC5FZmZlY3Q8YW55LCBhbnksIFI+IHwgTG9naWNQbGFuPGFueSwgUiwgYW55PlxuICA+XG4gIHJlYWRvbmx5IG1vZHVsZUlkPzogc3RyaW5nXG4gIHJlYWRvbmx5IGNyZWF0ZVN0YXRlPzogRWZmZWN0LkVmZmVjdDxTdWJzY3JpcHRpb25SZWYuU3Vic2NyaXB0aW9uUmVmPFM+LCBuZXZlciwgU2NvcGUuU2NvcGU+XG4gIHJlYWRvbmx5IGNyZWF0ZUFjdGlvbkh1Yj86IEVmZmVjdC5FZmZlY3Q8UHViU3ViLlB1YlN1YjxBPiwgbmV2ZXIsIFNjb3BlLlNjb3BlPlxuICAvKipcbiAgICogUHJpbWFyeSBSZWR1Y2VyIFx1NjYyMFx1NUMwNFx1RkYxQWBfdGFnIC0+IChzdGF0ZSwgYWN0aW9uKSA9PiBuZXh0U3RhdGVgXHUzMDAyXG4gICAqXG4gICAqIC0gXHU4MkU1XHU2M0QwXHU0RjlCXHVGRjBDXHU1MjE5IGRpc3BhdGNoIFx1NEYxQVx1NTcyOFx1NTNEMVx1NUUwMyBBY3Rpb24gXHU0RTRCXHU1MjREXHU1MTQ4XHU1NDBDXHU2QjY1XHU1RTk0XHU3NTI4XHU1QkY5XHU1RTk0IHJlZHVjZXJcdUZGMUJcbiAgICogLSBcdTgyRTVcdTY3RDBcdTRFMkEgYF90YWdgIFx1NjcyQVx1NUI5QVx1NEU0OSByZWR1Y2VyXHVGRjBDXHU1MjE5XHU4ODRDXHU0RTNBXHU0RTBFXHU1RjUzXHU1MjREIHdhdGNoZXItb25seSBcdTZBMjFcdTVGMEZcdTRFMDBcdTgxRjRcdTMwMDJcbiAgICovXG4gIHJlYWRvbmx5IHJlZHVjZXJzPzogUmVhZG9ubHk8UmVjb3JkPHN0cmluZywgKHN0YXRlOiBTLCBhY3Rpb246IEEpID0+IFM+PlxufVxuXG50eXBlIFBoYXNlUmVmID0geyBjdXJyZW50OiBcInNldHVwXCIgfCBcInJ1blwiIH1cblxuY29uc3QgY3JlYXRlUGhhc2VSZWYgPSAoKTogUGhhc2VSZWYgPT4gKHsgY3VycmVudDogXCJydW5cIiB9KVxuXG5leHBvcnQgY29uc3QgbWFrZSA9IDxTLCBBLCBSID0gbmV2ZXI+KFxuICBpbml0aWFsU3RhdGU6IFMsXG4gIG9wdGlvbnM6IE1vZHVsZVJ1bnRpbWVPcHRpb25zPFMsIEEsIFI+ID0ge31cbik6IEVmZmVjdC5FZmZlY3Q8UHVibGljTW9kdWxlUnVudGltZTxTLCBBPiwgbmV2ZXIsIFNjb3BlLlNjb3BlIHwgUj4gPT4ge1xuICBjb25zdCBwcm9ncmFtID0gRWZmZWN0LmdlbihmdW5jdGlvbiogKCkge1xuICAgIGNvbnN0IHN0YXRlUmVmID0gb3B0aW9ucy5jcmVhdGVTdGF0ZVxuICAgICAgPyB5aWVsZCogb3B0aW9ucy5jcmVhdGVTdGF0ZVxuICAgICAgOiB5aWVsZCogU3Vic2NyaXB0aW9uUmVmLm1ha2UoaW5pdGlhbFN0YXRlKVxuICAgIGNvbnN0IGFjdGlvbkh1YiA9IG9wdGlvbnMuY3JlYXRlQWN0aW9uSHViXG4gICAgICA/IHlpZWxkKiBvcHRpb25zLmNyZWF0ZUFjdGlvbkh1YlxuICAgICAgOiB5aWVsZCogUHViU3ViLnVuYm91bmRlZDxBPigpXG4gICAgY29uc3QgbGlmZWN5Y2xlID0geWllbGQqIExpZmVjeWNsZS5tYWtlTGlmZWN5Y2xlTWFuYWdlclxuXG4gICAgY29uc3QgaWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKVxuICAgIHlpZWxkKiBEZWJ1Zy5yZWNvcmQoe1xuICAgICAgdHlwZTogXCJtb2R1bGU6aW5pdFwiLFxuICAgICAgbW9kdWxlSWQ6IG9wdGlvbnMubW9kdWxlSWQsXG4gICAgICBydW50aW1lSWQ6IGlkLFxuICAgIH0pXG5cbiAgICAvLyBcdTUyMURcdTU5Q0JcdTcyQjZcdTYwMDFcdTVGRUJcdTcxNjdcdUZGMUFcbiAgICAvLyAtIFx1OTAxQVx1OEZDNyBzdGF0ZTp1cGRhdGUgXHU0RThCXHU0RUY2XHU1QzA2IE1vZHVsZSBcdTc2ODRcdTUyMURcdTU5Q0JcdTcyQjZcdTYwMDFcdTUxOTlcdTUxNjUgRGVidWcgXHU2RDQxXHVGRjBDXG4gICAgLy8gLSBcdTRGQkZcdTRFOEUgRGV2VG9vbHMgXHU1NzI4XHU2Q0ExXHU2NzA5XHU0RUZCXHU0RjU1XHU0RTFBXHU1MkExXHU0RUE0XHU0RTkyXHU2NUY2XHU1QzMxXHU4MEZEXHU3NzBCXHU1MjMwXHUzMDBDQ3VycmVudCBTdGF0ZVx1MzAwRFx1RkYwQ1xuICAgIC8vIC0gXHU1NDBDXHU2NUY2XHU0RTNBIHRpbWVsaW5lIFx1NjNEMFx1NEY5Qlx1N0IyQyAwIFx1NUUyN1x1NzJCNlx1NjAwMVx1RkYwQ1x1NTQwRVx1N0VFRFx1NEU4Qlx1NEVGNlx1NTNFRlx1NEVFNVx1NTdGQVx1NEU4RVx1NUI4M1x1NTA1QSB0aW1lLXRyYXZlbCBcdTg5QzZcdTU2RkVcdTMwMDJcbiAgICBjb25zdCBpbml0aWFsU25hcHNob3QgPSB5aWVsZCogU3Vic2NyaXB0aW9uUmVmLmdldChzdGF0ZVJlZilcbiAgICB5aWVsZCogRGVidWcucmVjb3JkKHtcbiAgICAgIHR5cGU6IFwic3RhdGU6dXBkYXRlXCIsXG4gICAgICBtb2R1bGVJZDogb3B0aW9ucy5tb2R1bGVJZCxcbiAgICAgIHN0YXRlOiBpbml0aWFsU25hcHNob3QsXG4gICAgICBydW50aW1lSWQ6IGlkLFxuICAgIH0pXG5cbiAgICBjb25zdCBzZXRTdGF0ZUludGVybmFsID0gKG5leHQ6IFMpID0+XG4gICAgICBTdWJzY3JpcHRpb25SZWYuc2V0KHN0YXRlUmVmLCBuZXh0KS5waXBlKFxuICAgICAgICBFZmZlY3QudGFwKCgpID0+XG4gICAgICAgICAgRGVidWcucmVjb3JkKHtcbiAgICAgICAgICAgIHR5cGU6IFwic3RhdGU6dXBkYXRlXCIsXG4gICAgICAgICAgICBtb2R1bGVJZDogb3B0aW9ucy5tb2R1bGVJZCxcbiAgICAgICAgICAgIHN0YXRlOiBuZXh0LFxuICAgICAgICAgICAgcnVudGltZUlkOiBpZCxcbiAgICAgICAgICB9KVxuICAgICAgICApXG4gICAgICApXG5cbiAgICAvLyBQcmltYXJ5IFJlZHVjZXIgXHU2NjIwXHU1QzA0XHVGRjFBXHU1MjFEXHU1OUNCXHU1MDNDXHU2NzY1XHU4MUVBIG9wdGlvbnMucmVkdWNlcnNcdUZGMENcdTVFNzZcdTUxNDFcdThCQjhcdTU3MjhcdThGRDBcdTg4NENcdTY1RjZcdTkwMUFcdThGQzdcdTUxODVcdTkwRThcdTk0QTlcdTVCNTBcdThGRkRcdTUyQTBcdUZGMDhcdTc1MjhcdTRFOEUgJC5yZWR1Y2VyIFx1OEJFRFx1NkNENVx1N0NENlx1RkYwOVx1MzAwMlxuICAgIGNvbnN0IHJlZHVjZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgKHN0YXRlOiBTLCBhY3Rpb246IEEpID0+IFM+KClcbiAgICBpZiAob3B0aW9ucy5yZWR1Y2Vycykge1xuICAgICAgZm9yIChjb25zdCBba2V5LCBmbl0gb2YgT2JqZWN0LmVudHJpZXMob3B0aW9ucy5yZWR1Y2VycykpIHtcbiAgICAgICAgcmVkdWNlck1hcC5zZXQoa2V5LCBmbiBhcyAoc3RhdGU6IFMsIGFjdGlvbjogQSkgPT4gUylcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBcdThCQjBcdTVGNTVcdTZCQ0ZcdTRFMkEgQWN0aW9uIFRhZyBcdTY2MkZcdTU0MjZcdTVERjJcdTdFQ0ZcdTg4QUJcdTZEM0VcdTUzRDFcdThGQzdcdUZGMENcdTc1MjhcdTRFOEVcdThCQ0FcdTY1QURcdTIwMUNcdThGREZcdTUyMzBcdTc2ODQgcmVkdWNlciBcdTZDRThcdTUxOENcdTIwMURcdTdCNDlcdTkxNERcdTdGNkVcdTk1MTlcdThCRUZcdTMwMDJcbiAgICBjb25zdCBkaXNwYXRjaGVkVGFncyA9IG5ldyBTZXQ8c3RyaW5nPigpXG5cbiAgICBjb25zdCByZWdpc3RlclJlZHVjZXIgPSAodGFnOiBzdHJpbmcsIGZuOiAoc3RhdGU6IFMsIGFjdGlvbjogQSkgPT4gUyk6IHZvaWQgPT4ge1xuICAgICAgaWYgKHJlZHVjZXJNYXAuaGFzKHRhZykpIHtcbiAgICAgICAgLy8gXHU5MUNEXHU1OTBEXHU2Q0U4XHU1MThDXHVGRjFBXHU2MjlCXHU1MUZBXHU1RTI2XHU2NzA5XHU5ODlEXHU1OTE2XHU0RTBBXHU0RTBCXHU2NTg3XHU3Njg0XHU5MTREXHU3RjZFXHU5NTE5XHU4QkVGXHVGRjBDXHU1NDBFXHU3RUVEXHU1NzI4IGNhdGNoQWxsQ2F1c2UgXHU0RTJEXHU3RURGXHU0RTAwXHU4OUUzXHU2NzkwXHU1RTc2XHU1M0QxXHU1MUZBXHU4QkNBXHU2NUFEXHU0RThCXHU0RUY2XHUzMDAyXG4gICAgICAgIHRocm93IFJlZHVjZXJEaWFnbm9zdGljcy5tYWtlUmVkdWNlckVycm9yKFxuICAgICAgICAgIFwiUmVkdWNlckR1cGxpY2F0ZUVycm9yXCIsXG4gICAgICAgICAgdGFnLFxuICAgICAgICAgIG9wdGlvbnMubW9kdWxlSWRcbiAgICAgICAgKVxuICAgICAgfVxuICAgICAgaWYgKGRpc3BhdGNoZWRUYWdzLmhhcyh0YWcpKSB7XG4gICAgICAgIC8vIFx1NTcyOFx1OEJFNSBUYWcgXHU1REYyXHU3RUNGXHU1M0QxXHU3NTFGXHU4RkM3IGRpc3BhdGNoIFx1NEU0Qlx1NTQwRVx1NjI0RFx1NkNFOFx1NTE4QyByZWR1Y2VyXHVGRjFBXHU4OUM2XHU0RTNBXHU1MzcxXHU5NjY5XHU5MTREXHU3RjZFXHVGRjBDXHU1NDBDXHU2ODM3XHU5MDFBXHU4RkM3XHU4MUVBXHU1QjlBXHU0RTQ5XHU5NTE5XHU4QkVGXHU3QzdCXHU1NzhCXHU2NkI0XHU5NzMyXHU3RUQ5XHU4QkNBXHU2NUFEXHU5MDNCXHU4RjkxXHUzMDAyXG4gICAgICAgIHRocm93IFJlZHVjZXJEaWFnbm9zdGljcy5tYWtlUmVkdWNlckVycm9yKFxuICAgICAgICAgIFwiUmVkdWNlckxhdGVSZWdpc3RyYXRpb25FcnJvclwiLFxuICAgICAgICAgIHRhZyxcbiAgICAgICAgICBvcHRpb25zLm1vZHVsZUlkXG4gICAgICAgIClcbiAgICAgIH1cbiAgICAgIHJlZHVjZXJNYXAuc2V0KHRhZywgZm4pXG4gICAgfVxuXG4gICAgY29uc3QgYXBwbHlQcmltYXJ5UmVkdWNlciA9IChhY3Rpb246IEEpID0+IHtcbiAgICAgIGNvbnN0IHRhZyA9IChhY3Rpb24gYXMgYW55KT8uX3RhZyA/PyAoYWN0aW9uIGFzIGFueSk/LnR5cGVcbiAgICAgIGlmICh0YWcgPT0gbnVsbCB8fCByZWR1Y2VyTWFwLnNpemUgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIEVmZmVjdC52b2lkXG4gICAgICB9XG4gICAgICBjb25zdCB0YWdLZXkgPSBTdHJpbmcodGFnKVxuICAgICAgZGlzcGF0Y2hlZFRhZ3MuYWRkKHRhZ0tleSlcbiAgICAgIGNvbnN0IHJlZHVjZXIgPSByZWR1Y2VyTWFwLmdldCh0YWdLZXkpXG4gICAgICBpZiAoIXJlZHVjZXIpIHtcbiAgICAgICAgcmV0dXJuIEVmZmVjdC52b2lkXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBTdWJzY3JpcHRpb25SZWYuZ2V0KHN0YXRlUmVmKS5waXBlKFxuICAgICAgICBFZmZlY3QuZmxhdE1hcCgocHJldikgPT4ge1xuICAgICAgICAgIGNvbnN0IG5leHQgPSByZWR1Y2VyKHByZXYsIGFjdGlvbilcbiAgICAgICAgICAvLyBcdTUzNzNcdTRGQkYgbmV4dCA9PT0gcHJldlx1RkYwQ1x1NEVDRFx1NzEzNlx1NTkwRFx1NzUyOCBzZXRTdGF0ZUludGVybmFsIFx1NzY4NCBEZWJ1ZyBcdTg4NENcdTRFM0FcdUZGMENcdTc1MzFcdTRFMEFcdTVDNDJcdTUxQjNcdTVCOUFcdTY2MkZcdTU0MjZcdTYzNkVcdTZCNjRcdTUwNUEgZGlmZlx1MzAwMlxuICAgICAgICAgIHJldHVybiBzZXRTdGF0ZUludGVybmFsKG5leHQpXG4gICAgICAgIH0pXG4gICAgICApXG4gICAgfVxuXG4gICAgY29uc3QgcnVudGltZTogUHVibGljTW9kdWxlUnVudGltZTxTLCBBPiA9IHtcbiAgICAgIGlkLFxuICAgICAgZ2V0U3RhdGU6IFN1YnNjcmlwdGlvblJlZi5nZXQoc3RhdGVSZWYpLFxuICAgICAgc2V0U3RhdGU6IHNldFN0YXRlSW50ZXJuYWwsXG4gICAgICBkaXNwYXRjaDogKGFjdGlvbikgPT5cbiAgICAgICAgYXBwbHlQcmltYXJ5UmVkdWNlcihhY3Rpb24pLnBpcGUoXG4gICAgICAgICAgLy8gXHU4QkIwXHU1RjU1IEFjdGlvbiBcdTZEM0VcdTUzRDFcdTRFOEJcdTRFRjZcbiAgICAgICAgICBFZmZlY3QuemlwUmlnaHQoXG4gICAgICAgICAgICBEZWJ1Zy5yZWNvcmQoe1xuICAgICAgICAgICAgICB0eXBlOiBcImFjdGlvbjpkaXNwYXRjaFwiLFxuICAgICAgICAgICAgICBtb2R1bGVJZDogb3B0aW9ucy5tb2R1bGVJZCxcbiAgICAgICAgICAgICAgYWN0aW9uLFxuICAgICAgICAgICAgICBydW50aW1lSWQ6IGlkLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApLFxuICAgICAgICAgIC8vIFx1NUMwNiBBY3Rpb24gXHU1M0QxXHU1RTAzXHU3RUQ5XHU2MjQwXHU2NzA5IHdhdGNoZXJcdUZGMDhMb2dpYyAvIEZsb3dcdUZGMDlcbiAgICAgICAgICBFZmZlY3QuemlwUmlnaHQoUHViU3ViLnB1Ymxpc2goYWN0aW9uSHViLCBhY3Rpb24pKVxuICAgICAgICApLFxuICAgICAgYWN0aW9ucyQ6IFN0cmVhbS5mcm9tUHViU3ViKGFjdGlvbkh1YiksXG4gICAgICBjaGFuZ2VzOiA8Vj4oc2VsZWN0b3I6IChzOiBTKSA9PiBWKSA9PlxuICAgICAgICBTdHJlYW0ubWFwKHN0YXRlUmVmLmNoYW5nZXMsIHNlbGVjdG9yKS5waXBlKFN0cmVhbS5jaGFuZ2VzKSxcbiAgICAgIHJlZjogPFYgPSBTPihzZWxlY3Rvcj86IChzOiBTKSA9PiBWKTogU3Vic2NyaXB0aW9uUmVmLlN1YnNjcmlwdGlvblJlZjxWPiA9PiB7XG4gICAgICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgICByZXR1cm4gc3RhdGVSZWYgYXMgdW5rbm93biBhcyBTdWJzY3JpcHRpb25SZWYuU3Vic2NyaXB0aW9uUmVmPFY+XG4gICAgICAgIH1cblxuICAgICAgICAvLyBcdTUzRUFcdThCRkJcdTZEM0VcdTc1MUZcdTg5QzZcdTU2RkVcdUZGMUFcdTkwMUFcdThGQzcgc2VsZWN0b3IgXHU0RUNFXHU0RTNCXHU3MkI2XHU2MDAxXHU2RDNFXHU3NTFGXHU1MDNDXHVGRjBDXHU1RTc2XHU3OTgxXHU2QjYyXHU1MTk5XHU1MTY1XG4gICAgICAgIGNvbnN0IHJlYWRvbmx5UmVmID0ge1xuICAgICAgICAgIGdldDogRWZmZWN0Lm1hcChTdWJzY3JpcHRpb25SZWYuZ2V0KHN0YXRlUmVmKSwgc2VsZWN0b3IpLFxuICAgICAgICAgIG1vZGlmeTogKCkgPT4gRWZmZWN0LmRpZU1lc3NhZ2UoXCJDYW5ub3Qgd3JpdGUgdG8gYSBkZXJpdmVkIHJlZlwiKSxcbiAgICAgICAgfSBhcyB1bmtub3duIGFzIFJlZi5SZWY8Vj5cblxuICAgICAgICBjb25zdCBkZXJpdmVkID0ge1xuICAgICAgICAgIC8vIFN1YnNjcmlwdGlvblJlZiBcdTUxODVcdTkwRThcdTVCOUVcdTczQjBcdTRGMUFcdThCQkZcdTk1RUUgc2VsZi5yZWYgLyBzZWxmLnB1YnN1YiAvIHNlbGYuc2VtYXBob3JlXG4gICAgICAgICAgcmVmOiByZWFkb25seVJlZixcbiAgICAgICAgICBwdWJzdWI6IHtcbiAgICAgICAgICAgIHB1Ymxpc2g6ICgpID0+IEVmZmVjdC5zdWNjZWVkKHRydWUpLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2VtYXBob3JlOiB7XG4gICAgICAgICAgICB3aXRoUGVybWl0czpcbiAgICAgICAgICAgICAgKCkgPT5cbiAgICAgICAgICAgICAgPEEsIEUsIFI+KHNlbGY6IEVmZmVjdC5FZmZlY3Q8QSwgRSwgUj4pOiBFZmZlY3QuRWZmZWN0PEEsIEUsIFI+ID0+XG4gICAgICAgICAgICAgICAgc2VsZixcbiAgICAgICAgICB9LFxuICAgICAgICAgIGdldDogcmVhZG9ubHlSZWYuZ2V0LFxuICAgICAgICAgIG1vZGlmeTogcmVhZG9ubHlSZWYubW9kaWZ5LFxuICAgICAgICAgIC8vIFx1NkQzRVx1NzUxRlx1NkQ0MVx1RkYxQVx1NUJGOVx1NTM5Rlx1NTlDQiBzdGF0ZVJlZi5jaGFuZ2VzIFx1NTA1QSBzZWxlY3RvciBcdTY2MjBcdTVDMDQgKyBcdTUzQkJcdTkxQ0RcbiAgICAgICAgICBjaGFuZ2VzOiBTdHJlYW0ubWFwKHN0YXRlUmVmLmNoYW5nZXMsIHNlbGVjdG9yKS5waXBlKFxuICAgICAgICAgICAgU3RyZWFtLmNoYW5nZXNcbiAgICAgICAgICApIGFzIFN0cmVhbS5TdHJlYW08Vj4sXG4gICAgICAgIH0gYXMgdW5rbm93biBhcyBTdWJzY3JpcHRpb25SZWYuU3Vic2NyaXB0aW9uUmVmPFY+XG5cbiAgICAgICAgcmV0dXJuIGRlcml2ZWRcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBcdTVDMDZcdTUxODVcdTkwRThcdTZDRThcdTUxOENcdTUxRkRcdTY1NzBcdTY2QjRcdTk3MzJcdTdFRDkgQm91bmRBcGlSdW50aW1lXHVGRjBDXHU3NTI4XHU0RThFXHU1QjlFXHU3M0IwICQucmVkdWNlciBcdThCRURcdTZDRDVcdTdDRDZcdTMwMDJcbiAgICA7KHJ1bnRpbWUgYXMgYW55KS5fX3JlZ2lzdGVyUmVkdWNlciA9IHJlZ2lzdGVyUmVkdWNlclxuXG4gICAgLy8gXHU2Q0U4XHU1MThDIFJ1bnRpbWVcdUZGMENcdTRGOUJcdThERThcdTZBMjFcdTU3NTdcdThCQkZcdTk1RUVcdUZGMDh1c2VSZW1vdGUgLyBMaW5rIFx1N0I0OVx1RkYwOVx1NEY3Rlx1NzUyOFxuICAgIGlmIChvcHRpb25zLnRhZykge1xuICAgICAgcmVnaXN0ZXJSdW50aW1lKG9wdGlvbnMudGFnIGFzIENvbnRleHQuVGFnPGFueSwgUHVibGljTW9kdWxlUnVudGltZTxTLCBBPj4sIHJ1bnRpbWUpXG4gICAgfVxuXG4gICAgeWllbGQqIEVmZmVjdC5hZGRGaW5hbGl6ZXIoKCkgPT5cbiAgICAgIGxpZmVjeWNsZS5ydW5EZXN0cm95LnBpcGUoXG4gICAgICAgIEVmZmVjdC5mbGF0TWFwKCgpID0+XG4gICAgICAgICAgRGVidWcucmVjb3JkKHtcbiAgICAgICAgICAgIHR5cGU6IFwibW9kdWxlOmRlc3Ryb3lcIixcbiAgICAgICAgICAgIG1vZHVsZUlkOiBvcHRpb25zLm1vZHVsZUlkLFxuICAgICAgICAgICAgcnVudGltZUlkOiBpZCxcbiAgICAgICAgICB9KVxuICAgICAgICApLFxuICAgICAgICBFZmZlY3QudGFwKCgpID0+XG4gICAgICAgICAgb3B0aW9ucy50YWdcbiAgICAgICAgICAgID8gRWZmZWN0LnN5bmMoKCkgPT5cbiAgICAgICAgICAgICAgICB1bnJlZ2lzdGVyUnVudGltZShcbiAgICAgICAgICAgICAgICAgIG9wdGlvbnMudGFnIGFzIENvbnRleHQuVGFnPGFueSwgUHVibGljTW9kdWxlUnVudGltZTxhbnksIGFueT4+XG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICA6IEVmZmVjdC52b2lkXG4gICAgICAgIClcbiAgICAgIClcbiAgICApXG5cbiAgICBpZiAob3B0aW9ucy50YWcgJiYgb3B0aW9ucy5sb2dpY3M/Lmxlbmd0aCkge1xuICAgICAgY29uc3QgbW9kdWxlSWRGb3JMb2dzID0gb3B0aW9ucy5tb2R1bGVJZCA/PyBcInVua25vd25cIlxuXG4gICAgICBjb25zdCB3aXRoUnVudGltZUFuZExpZmVjeWNsZSA9IDxSMiwgRTIsIEEyPihcbiAgICAgICAgZWZmOiBFZmZlY3QuRWZmZWN0PEEyLCBFMiwgUjI+LFxuICAgICAgICBwaGFzZVJlZj86IFBoYXNlUmVmXG4gICAgICApID0+IHtcbiAgICAgICAgY29uc3Qgd2l0aFNlcnZpY2VzID0gRWZmZWN0LnByb3ZpZGVTZXJ2aWNlKFxuICAgICAgICAgIEVmZmVjdC5wcm92aWRlU2VydmljZShcbiAgICAgICAgICAgIGVmZixcbiAgICAgICAgICAgIExpZmVjeWNsZS5MaWZlY3ljbGVDb250ZXh0LFxuICAgICAgICAgICAgbGlmZWN5Y2xlXG4gICAgICAgICAgKSxcbiAgICAgICAgICBvcHRpb25zLnRhZyBhcyBDb250ZXh0LlRhZzxhbnksIFB1YmxpY01vZHVsZVJ1bnRpbWU8UywgQT4+LFxuICAgICAgICAgIHJ1bnRpbWVcbiAgICAgICAgKVxuXG4gICAgICAgIC8vIFx1NEUzQSBMb2dpYyBcdTUxODVcdTkwRThcdTc2ODRcdTYyNDBcdTY3MDkgRWZmZWN0IFx1NjVFNVx1NUZEN1x1NjI1M1x1NEUwQSBtb2R1bGVJZCBcdTdCNDlcdTZDRThcdTg5RTNcdUZGMENcdTRGQkZcdTRFOEVcdTU3MjggTG9nZ2VyIFx1NUM0Mlx1ODFFQVx1NTJBOFx1NTE3M1x1ODA1NFx1NTIzMFx1NTE3N1x1NEY1MyBNb2R1bGVcdTMwMDJcbiAgICAgICAgY29uc3QgYW5ub3RhdGVkID0gRWZmZWN0LmFubm90YXRlTG9ncyh7XG4gICAgICAgICAgXCJsb2dpeC5tb2R1bGVJZFwiOiBtb2R1bGVJZEZvckxvZ3MsXG4gICAgICAgIH0pKHdpdGhTZXJ2aWNlcyBhcyBFZmZlY3QuRWZmZWN0PEEyLCBFMiwgYW55PikgYXMgRWZmZWN0LkVmZmVjdDxBMiwgRTIsIFIyPlxuXG4gICAgICAgIGlmICghcGhhc2VSZWYpIHtcbiAgICAgICAgICByZXR1cm4gYW5ub3RhdGVkXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwaGFzZVNlcnZpY2U6IExvZ2ljRGlhZ25vc3RpY3MuTG9naWNQaGFzZVNlcnZpY2UgPSB7XG4gICAgICAgICAgZ2V0IGN1cnJlbnQoKSB7XG4gICAgICAgICAgICByZXR1cm4gcGhhc2VSZWYuY3VycmVudFxuICAgICAgICAgIH0sXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gRWZmZWN0LnByb3ZpZGVTZXJ2aWNlKFxuICAgICAgICAgIGFubm90YXRlZCxcbiAgICAgICAgICBMb2dpY0RpYWdub3N0aWNzLkxvZ2ljUGhhc2VTZXJ2aWNlVGFnLFxuICAgICAgICAgIHBoYXNlU2VydmljZVxuICAgICAgICApXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGhhbmRsZUxvZ2ljRmFpbHVyZSA9IChjYXVzZTogYW55KSA9PiB7XG4gICAgICAgIGNvbnN0IHBoYXNlRXJyb3JNYXJrZXIgPSBbXG4gICAgICAgICAgLi4uQ2F1c2UuZmFpbHVyZXMoY2F1c2UpLFxuICAgICAgICAgIC4uLkNhdXNlLmRlZmVjdHMoY2F1c2UpLFxuICAgICAgICBdLnNvbWUoKGVycikgPT4gKGVyciBhcyBhbnkpPy5fdGFnID09PSBcIkxvZ2ljUGhhc2VFcnJvclwiKVxuXG4gICAgICAgIGNvbnN0IGJhc2UgPSBsaWZlY3ljbGUubm90aWZ5RXJyb3IoY2F1c2UsIHtcbiAgICAgICAgICBwaGFzZTogXCJsb2dpYy5mb3JrXCIsXG4gICAgICAgICAgbW9kdWxlSWQ6IG9wdGlvbnMubW9kdWxlSWQsXG4gICAgICAgIH0pLnBpcGUoXG4gICAgICAgICAgRWZmZWN0LmZsYXRNYXAoKCkgPT5cbiAgICAgICAgICBEZWJ1Zy5yZWNvcmQoe1xuICAgICAgICAgICAgdHlwZTogXCJsaWZlY3ljbGU6ZXJyb3JcIixcbiAgICAgICAgICAgIG1vZHVsZUlkOiBvcHRpb25zLm1vZHVsZUlkLFxuICAgICAgICAgICAgY2F1c2UsXG4gICAgICAgICAgICBydW50aW1lSWQ6IGlkLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgKSxcbiAgICAgICAgICBFZmZlY3QudGFwKCgpID0+XG4gICAgICAgICAgICBMaWZlY3ljbGVEaWFnbm9zdGljcy5lbWl0TWlzc2luZ09uRXJyb3JEaWFnbm9zdGljSWZOZWVkZWQoXG4gICAgICAgICAgICAgIGxpZmVjeWNsZSxcbiAgICAgICAgICAgICAgb3B0aW9ucy5tb2R1bGVJZFxuICAgICAgICAgICAgKVxuICAgICAgICAgICksXG4gICAgICAgICAgRWZmZWN0LnRhcCgoKSA9PlxuICAgICAgICAgICAgUmVkdWNlckRpYWdub3N0aWNzLmVtaXREaWFnbm9zdGljc0Zyb21DYXVzZShcbiAgICAgICAgICAgICAgY2F1c2UsXG4gICAgICAgICAgICAgIG9wdGlvbnMubW9kdWxlSWRcbiAgICAgICAgICAgIClcbiAgICAgICAgICApLFxuICAgICAgICAgIEVmZmVjdC50YXAoKCkgPT5cbiAgICAgICAgICAgIExvZ2ljRGlhZ25vc3RpY3MuZW1pdEVudlNlcnZpY2VOb3RGb3VuZERpYWdub3N0aWNJZk5lZWRlZChcbiAgICAgICAgICAgICAgY2F1c2UsXG4gICAgICAgICAgICAgIG9wdGlvbnMubW9kdWxlSWRcbiAgICAgICAgICAgIClcbiAgICAgICAgICApLFxuICAgICAgICAgIEVmZmVjdC50YXAoKCkgPT5cbiAgICAgICAgICAgIExvZ2ljRGlhZ25vc3RpY3MuZW1pdEludmFsaWRQaGFzZURpYWdub3N0aWNJZk5lZWRlZChcbiAgICAgICAgICAgICAgY2F1c2UsXG4gICAgICAgICAgICAgIG9wdGlvbnMubW9kdWxlSWRcbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG4gICAgICAgIClcblxuICAgICAgICAvLyBcdTVCRjlcdTRFOEUgTG9naWNQaGFzZUVycm9yXHVGRjFBXHU1M0VBXHU1M0QxXHU4QkNBXHU2NUFEXHVGRjBDXHU0RTBEXHU4QkE5XHU2NTc0XHU0RTJBIE1vZHVsZVJ1bnRpbWUgXHU2Nzg0XHU5MDIwXHU1OTMxXHU4RDI1XHVGRjBDXG4gICAgICAgIC8vIFx1NEVFNVx1NTE0RCBydW5TeW5jIFx1OERFRlx1NUY4NFx1ODhBQiBBc3luY0ZpYmVyRXhjZXB0aW9uIFx1NjI1M1x1NjVBRFx1MzAwMlxuICAgICAgICBpZiAocGhhc2VFcnJvck1hcmtlcikge1xuICAgICAgICAgIHJldHVybiBiYXNlXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYmFzZS5waXBlKEVmZmVjdC5mbGF0TWFwKCgpID0+IEVmZmVjdC5mYWlsQ2F1c2UoY2F1c2UpKSlcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNMb2dpY1BsYW4gPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBMb2dpY1BsYW48YW55LCBhbnksIGFueT4gPT5cbiAgICAgICAgQm9vbGVhbihcbiAgICAgICAgICB2YWx1ZSAmJlxuICAgICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgICAgIFwicnVuXCIgaW4gKHZhbHVlIGFzIGFueSkgJiZcbiAgICAgICAgICBcInNldHVwXCIgaW4gKHZhbHVlIGFzIGFueSlcbiAgICAgICAgKVxuXG4gICAgICBjb25zdCByZXR1cm5zTG9naWNQbGFuID0gKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiA9PlxuICAgICAgICBCb29sZWFuKCh2YWx1ZSBhcyBhbnkpPy5fX2xvZ2ljUGxhbiA9PT0gdHJ1ZSlcblxuICAgICAgY29uc3QgZXh0cmFjdFBoYXNlUmVmID0gKHZhbHVlOiB1bmtub3duKTogUGhhc2VSZWYgfCB1bmRlZmluZWQgPT5cbiAgICAgICAgKHZhbHVlIGFzIGFueSk/Ll9fcGhhc2VSZWYgYXMgUGhhc2VSZWYgfCB1bmRlZmluZWRcblxuICAgICAgY29uc3Qgbm9ybWFsaXplVG9QbGFuID0gKFxuICAgICAgICB2YWx1ZTogdW5rbm93blxuICAgICAgKTogTG9naWNQbGFuPGFueSwgYW55LCBhbnk+ID0+XG4gICAgICAgIGlzTG9naWNQbGFuKHZhbHVlKVxuICAgICAgICAgID8gT2JqZWN0LmFzc2lnbih2YWx1ZSBhcyBMb2dpY1BsYW48YW55LCBhbnksIGFueT4sIHtcbiAgICAgICAgICAgIF9fcGhhc2VSZWY6IGV4dHJhY3RQaGFzZVJlZih2YWx1ZSkgPz8gY3JlYXRlUGhhc2VSZWYoKSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIDogT2JqZWN0LmFzc2lnbihcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc2V0dXA6IEVmZmVjdC52b2lkLFxuICAgICAgICAgICAgICBydW46IHZhbHVlIGFzIEVmZmVjdC5FZmZlY3Q8YW55LCBhbnksIGFueT4sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeyBfX3BoYXNlUmVmOiBleHRyYWN0UGhhc2VSZWYodmFsdWUpID8/IGNyZWF0ZVBoYXNlUmVmKCkgfVxuICAgICAgICAgIClcblxuICAgICAgZm9yIChjb25zdCByYXdMb2dpYyBvZiBvcHRpb25zLmxvZ2ljcykge1xuICAgICAgICBpZiAoaXNMb2dpY1BsYW4ocmF3TG9naWMpKSB7XG4gICAgICAgICAgY29uc3QgcGhhc2VSZWYgPSBleHRyYWN0UGhhc2VSZWYocmF3TG9naWMpID8/IGNyZWF0ZVBoYXNlUmVmKClcbiAgICAgICAgICBjb25zdCBzZXR1cFBoYXNlID0gd2l0aFJ1bnRpbWVBbmRMaWZlY3ljbGUocmF3TG9naWMuc2V0dXAsIHBoYXNlUmVmKVxuICAgICAgICAgIGNvbnN0IHJ1blBoYXNlID0gd2l0aFJ1bnRpbWVBbmRMaWZlY3ljbGUocmF3TG9naWMucnVuLCBwaGFzZVJlZilcblxuICAgICAgICAgIHBoYXNlUmVmLmN1cnJlbnQgPSBcInNldHVwXCJcbiAgICAgICAgICBnbG9iYWxMb2dpY1BoYXNlUmVmLmN1cnJlbnQgPSBcInNldHVwXCJcbiAgICAgICAgICB5aWVsZCogc2V0dXBQaGFzZS5waXBlKEVmZmVjdC5jYXRjaEFsbENhdXNlKGhhbmRsZUxvZ2ljRmFpbHVyZSkpXG4gICAgICAgICAgcGhhc2VSZWYuY3VycmVudCA9IFwicnVuXCJcbiAgICAgICAgICBnbG9iYWxMb2dpY1BoYXNlUmVmLmN1cnJlbnQgPSBcInJ1blwiXG4gICAgICAgICAgeWllbGQqIEVmZmVjdC5mb3JrU2NvcGVkKFxuICAgICAgICAgICAgcnVuUGhhc2UucGlwZShFZmZlY3QuY2F0Y2hBbGxDYXVzZShoYW5kbGVMb2dpY0ZhaWx1cmUpKVxuICAgICAgICAgIClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJldHVybnNMb2dpY1BsYW4ocmF3TG9naWMpKSB7XG4gICAgICAgICAgLy8gbG9naWMgXHU2NjJGXHU4RkQ0XHU1NkRFIExvZ2ljUGxhbiBcdTc2ODQgRWZmZWN0XHVGRjBDXHU5NzAwXHU4OTgxXHU4RkQwXHU4ODRDXHU0RTAwXHU2QjIxXHU0RUU1XHU4OUUzXHU2NzkwXHU1MUZBIHBsYW5cbiAgICAgICAgICBjb25zdCBwaGFzZVJlZiA9IGV4dHJhY3RQaGFzZVJlZihyYXdMb2dpYykgPz8gY3JlYXRlUGhhc2VSZWYoKVxuICAgICAgICAgIGNvbnN0IG1ha2VOb29wUGxhbiA9ICgpOiBMb2dpY1BsYW48YW55LCBhbnksIGFueT4gPT5cbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzZXR1cDogRWZmZWN0LnZvaWQsXG4gICAgICAgICAgICAgICAgcnVuOiBFZmZlY3Qudm9pZCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIF9fcGhhc2VSZWY6IHBoYXNlUmVmLFxuICAgICAgICAgICAgICAgIC8vIFx1NjgwN1x1OEJCMFx1NEUzQVx1MjAxQ1x1NEVDNVx1NzUyOFx1NEU4RSBwaGFzZSBcdThCQ0FcdTY1QURcdTc2ODRcdTUzNjBcdTRGNEQgcGxhblx1MjAxRFx1RkYwQ1x1NTQwRVx1N0VFRFx1NEUwRFx1NTE4RCBmb3JrIHJ1biBcdTZCQjVcdUZGMENcbiAgICAgICAgICAgICAgICAvLyBcdTRFRTVcdTkwN0ZcdTUxNERcdTU3MjggcnVuU3luYyBcdThERUZcdTVGODRcdTRFMEFcdTRFQTdcdTc1MUYgQXN5bmNGaWJlckV4Y2VwdGlvblx1MzAwMlxuICAgICAgICAgICAgICAgIF9fc2tpcFJ1bjogdHJ1ZSBhcyBjb25zdCxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKVxuXG4gICAgICAgICAgcGhhc2VSZWYuY3VycmVudCA9IFwic2V0dXBcIlxuICAgICAgICAgIGdsb2JhbExvZ2ljUGhhc2VSZWYuY3VycmVudCA9IFwic2V0dXBcIlxuICAgICAgICAgIGNvbnN0IHJlc29sdmVkUGxhbiA9IHlpZWxkKiB3aXRoUnVudGltZUFuZExpZmVjeWNsZShcbiAgICAgICAgICAgIHJhd0xvZ2ljIGFzIEVmZmVjdC5FZmZlY3Q8YW55LCBhbnksIGFueT4sXG4gICAgICAgICAgICBwaGFzZVJlZlxuICAgICAgICAgICkucGlwZShcbiAgICAgICAgICAgIEVmZmVjdC5tYXRjaENhdXNlRWZmZWN0KHtcbiAgICAgICAgICAgICAgb25TdWNjZXNzOiAodmFsdWUpID0+XG4gICAgICAgICAgICAgICAgRWZmZWN0LnN1Y2NlZWQobm9ybWFsaXplVG9QbGFuKHZhbHVlKSksXG4gICAgICAgICAgICAgIG9uRmFpbHVyZTogKGNhdXNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNMb2dpY1BoYXNlRXJyb3IgPSBbXG4gICAgICAgICAgICAgICAgICAuLi5DYXVzZS5mYWlsdXJlcyhjYXVzZSksXG4gICAgICAgICAgICAgICAgICAuLi5DYXVzZS5kZWZlY3RzKGNhdXNlKSxcbiAgICAgICAgICAgICAgICBdLnNvbWUoKGVycikgPT4gKGVyciBhcyBhbnkpPy5fdGFnID09PSBcIkxvZ2ljUGhhc2VFcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgaWYgKGlzTG9naWNQaGFzZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAvLyBcdTVCRjlcdTRFOEUgTG9naWNQaGFzZUVycm9yXHVGRjFBXHU0RUM1XHU4QkIwXHU1RjU1XHU4QkNBXHU2NUFEXHU1RTc2XHU3RUU3XHU3RUVEXHU2Nzg0XHU5MDIwXHU0RTAwXHU0RTJBIG5vb3AgcGxhblx1RkYwQ1xuICAgICAgICAgICAgICAgICAgLy8gXHU0RUU1XHU5MDdGXHU1MTREXHU4QkE5IE1vZHVsZVJ1bnRpbWUubWFrZSBcdTU3MjggcnVuU3luYyBcdThERUZcdTVGODRcdTRFMEFcdTU5MzFcdThEMjVcdTMwMDJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBMb2dpY0RpYWdub3N0aWNzLmVtaXRJbnZhbGlkUGhhc2VEaWFnbm9zdGljSWZOZWVkZWQoXG4gICAgICAgICAgICAgICAgICAgIGNhdXNlLFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm1vZHVsZUlkXG4gICAgICAgICAgICAgICAgICApLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgIEVmZmVjdC56aXBSaWdodChoYW5kbGVMb2dpY0ZhaWx1cmUoY2F1c2UpKSxcbiAgICAgICAgICAgICAgICAgICAgRWZmZWN0LmFzKG1ha2VOb29wUGxhbigpKVxuICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFx1NTE3Nlx1NEVENlx1OTUxOVx1OEJFRlx1RkYxQVx1NEVDRFx1NjMwOVx1Nzg2Q1x1OTUxOVx1OEJFRlx1NTkwNFx1NzQwNiBcdTIwMTRcdTIwMTQgXHU1MTQ4XHU1M0QxXHU4QkNBXHU2NUFEL1x1OTUxOVx1OEJFRlx1RkYwQ1x1NTE4RCBmYWlsQ2F1c2UgXHU4QkE5XHU0RTBBXHU1QzQyXHU2MTFGXHU3N0U1XHUzMDAyXG4gICAgICAgICAgICAgICAgcmV0dXJuIExvZ2ljRGlhZ25vc3RpY3MuZW1pdEVudlNlcnZpY2VOb3RGb3VuZERpYWdub3N0aWNJZk5lZWRlZChcbiAgICAgICAgICAgICAgICAgIGNhdXNlLFxuICAgICAgICAgICAgICAgICAgb3B0aW9ucy5tb2R1bGVJZFxuICAgICAgICAgICAgICAgICkucGlwZShcbiAgICAgICAgICAgICAgICAgIEVmZmVjdC56aXBSaWdodChoYW5kbGVMb2dpY0ZhaWx1cmUoY2F1c2UpKSxcbiAgICAgICAgICAgICAgICAgIEVmZmVjdC56aXBSaWdodChFZmZlY3QuZmFpbENhdXNlKGNhdXNlKSlcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIClcblxuICAgICAgICAgIGNvbnN0IHBsYW5QaGFzZVJlZiA9XG4gICAgICAgICAgICBleHRyYWN0UGhhc2VSZWYocmVzb2x2ZWRQbGFuKSA/P1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihyZXNvbHZlZFBsYW4sIHsgX19waGFzZVJlZjogcGhhc2VSZWYgfSkuX19waGFzZVJlZlxuICAgICAgICAgIGNvbnN0IHNldHVwUGhhc2UgPSB3aXRoUnVudGltZUFuZExpZmVjeWNsZShyZXNvbHZlZFBsYW4uc2V0dXAsIHBsYW5QaGFzZVJlZilcbiAgICAgICAgICBjb25zdCBydW5QaGFzZSA9IHdpdGhSdW50aW1lQW5kTGlmZWN5Y2xlKHJlc29sdmVkUGxhbi5ydW4sIHBsYW5QaGFzZVJlZilcblxuICAgICAgICAgIC8vIFx1NTk4Mlx1Njc5Q1x1NjYyRlx1NzUyOFx1NEU4RSBwaGFzZSBcdThCQ0FcdTY1QURcdTc2ODRcdTUzNjBcdTRGNEQgcGxhblx1RkYwQ1x1NEVDNVx1NjI2N1x1ODg0QyBzZXR1cCBcdTZCQjVcdUZGMDhcdTkwMUFcdTVFMzhcdTRFM0EgRWZmZWN0LnZvaWRcdUZGMDlcdUZGMENcbiAgICAgICAgICAvLyBcdTRFMERcdTUxOEQgZm9yayBydW4gXHU2QkI1XHVGRjBDXHU0RkREXHU4QkMxXHU2NTc0XHU0RTJBIE1vZHVsZVJ1bnRpbWUubWFrZSBcdTU3MjggcnVuU3luYyBcdTRFMEJcdTRGRERcdTYzMDFcdTU0MENcdTZCNjVcdTMwMDJcbiAgICAgICAgICBjb25zdCBza2lwUnVuID0gKHJlc29sdmVkUGxhbiBhcyBhbnkpLl9fc2tpcFJ1biA9PT0gdHJ1ZVxuXG4gICAgICAgICAgcGxhblBoYXNlUmVmLmN1cnJlbnQgPSBcInNldHVwXCJcbiAgICAgICAgICBnbG9iYWxMb2dpY1BoYXNlUmVmLmN1cnJlbnQgPSBcInNldHVwXCJcbiAgICAgICAgICB5aWVsZCogc2V0dXBQaGFzZS5waXBlKEVmZmVjdC5jYXRjaEFsbENhdXNlKGhhbmRsZUxvZ2ljRmFpbHVyZSkpXG5cbiAgICAgICAgICBpZiAoIXNraXBSdW4pIHtcbiAgICAgICAgICAgIHBsYW5QaGFzZVJlZi5jdXJyZW50ID0gXCJydW5cIlxuICAgICAgICAgICAgZ2xvYmFsTG9naWNQaGFzZVJlZi5jdXJyZW50ID0gXCJydW5cIlxuICAgICAgICAgICAgeWllbGQqIEVmZmVjdC5mb3JrU2NvcGVkKFxuICAgICAgICAgICAgICBydW5QaGFzZS5waXBlKEVmZmVjdC5jYXRjaEFsbENhdXNlKGhhbmRsZUxvZ2ljRmFpbHVyZSkpXG4gICAgICAgICAgICApXG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBcdTlFRDhcdThCQTRcdUZGMUFcdTUzNTVcdTk2MzZcdTZCQjUgTG9naWNcdUZGMENcdTYzMDlcdTY1RTdcdTY3MDlcdTg4NENcdTRFM0FcdTc2RjRcdTYzQTUgZm9ya1x1RkYxQlx1ODJFNVx1OTAzQlx1OEY5MVx1NUI4Q1x1NjIxMFx1NTQwRVx1OEZENFx1NTZERSBMb2dpY1BsYW5cdUZGMENcdTdFRTdcdTdFRURcdTYyNjdcdTg4NEMgc2V0dXAvcnVuXHUzMDAyXG4gICAgICAgIGNvbnN0IGJhc2VQaGFzZVJlZiA9IGV4dHJhY3RQaGFzZVJlZihyYXdMb2dpYylcbiAgICAgICAgY29uc3QgcnVuUGhhc2UgPSB3aXRoUnVudGltZUFuZExpZmVjeWNsZShcbiAgICAgICAgICByYXdMb2dpYyBhcyBFZmZlY3QuRWZmZWN0PGFueSwgYW55LCBhbnk+LFxuICAgICAgICAgIGJhc2VQaGFzZVJlZlxuICAgICAgICApLnBpcGUoRWZmZWN0LmNhdGNoQWxsQ2F1c2UoaGFuZGxlTG9naWNGYWlsdXJlKSlcblxuICAgICAgICBjb25zdCBydW5GaWJlciA9IHlpZWxkKiBFZmZlY3QuZm9ya1Njb3BlZChydW5QaGFzZSlcblxuICAgICAgICB5aWVsZCogRWZmZWN0LmZvcmtTY29wZWQoXG4gICAgICAgICAgRmliZXIuYXdhaXQocnVuRmliZXIpLnBpcGUoXG4gICAgICAgICAgICBFZmZlY3QuZmxhdE1hcCgoZXhpdCkgPT5cbiAgICAgICAgICAgICAgRXhpdC5tYXRjaChleGl0LCB7XG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiAoKSA9PiBFZmZlY3Qudm9pZCxcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3M6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc3QgZXhlY3V0ZVBsYW4gPSAoXG4gICAgICAgICAgICAgICAgICAgIHBsYW46IExvZ2ljUGxhbjxhbnksIGFueSwgYW55PlxuICAgICAgICAgICAgICAgICAgKTogRWZmZWN0LkVmZmVjdDx2b2lkLCB1bmtub3duLCBhbnk+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGhhc2VSZWYgPSBleHRyYWN0UGhhc2VSZWYocGxhbikgPz8gY3JlYXRlUGhhc2VSZWYoKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXR1cFBoYXNlID0gd2l0aFJ1bnRpbWVBbmRMaWZlY3ljbGUoXG4gICAgICAgICAgICAgICAgICAgICAgcGxhbi5zZXR1cCxcbiAgICAgICAgICAgICAgICAgICAgICBwaGFzZVJlZlxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJ1blBsYW5QaGFzZSA9IHdpdGhSdW50aW1lQW5kTGlmZWN5Y2xlKFxuICAgICAgICAgICAgICAgICAgICAgIHBsYW4ucnVuLFxuICAgICAgICAgICAgICAgICAgICAgIHBoYXNlUmVmXG4gICAgICAgICAgICAgICAgICAgIClcblxuICAgICAgICAgICAgICAgICAgICBwaGFzZVJlZi5jdXJyZW50ID0gXCJzZXR1cFwiXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbExvZ2ljUGhhc2VSZWYuY3VycmVudCA9IFwic2V0dXBcIlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2V0dXBQaGFzZS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgIEVmZmVjdC5jYXRjaEFsbENhdXNlKGhhbmRsZUxvZ2ljRmFpbHVyZSksXG4gICAgICAgICAgICAgICAgICAgICAgRWZmZWN0LnRhcCgoKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgRWZmZWN0LnN5bmMoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwaGFzZVJlZi5jdXJyZW50ID0gXCJydW5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxMb2dpY1BoYXNlUmVmLmN1cnJlbnQgPSBcInJ1blwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgICAgRWZmZWN0LnppcFJpZ2h0KFxuICAgICAgICAgICAgICAgICAgICAgICAgRWZmZWN0LmZvcmtTY29wZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJ1blBsYW5QaGFzZS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVmZmVjdC5jYXRjaEFsbENhdXNlKGhhbmRsZUxvZ2ljRmFpbHVyZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgICAgRWZmZWN0LmFzVm9pZFxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChpc0xvZ2ljUGxhbih2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV4ZWN1dGVQbGFuKHZhbHVlKVxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAocmV0dXJuc0xvZ2ljUGxhbih2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdpdGhSdW50aW1lQW5kTGlmZWN5Y2xlKFxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlIGFzIEVmZmVjdC5FZmZlY3Q8YW55LCBhbnksIGFueT4sXG4gICAgICAgICAgICAgICAgICAgICAgYmFzZVBoYXNlUmVmXG4gICAgICAgICAgICAgICAgICAgICkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICBFZmZlY3QubWFwKG5vcm1hbGl6ZVRvUGxhbiksXG4gICAgICAgICAgICAgICAgICAgICAgRWZmZWN0Lm1hdGNoQ2F1c2VFZmZlY3Qoe1xuICAgICAgICAgICAgICAgICAgICAgICAgb25GYWlsdXJlOiAoY2F1c2UpID0+IGhhbmRsZUxvZ2ljRmFpbHVyZShjYXVzZSksXG4gICAgICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3M6IChwbGFuKSA9PiBleGVjdXRlUGxhbihwbGFuKSxcbiAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIHJldHVybiBFZmZlY3Qudm9pZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICB9XG5cbiAgICAgIC8vIFx1OEJBOVx1NURGMiBmb3JrIFx1NzY4NCBMb2dpYyBcdTgzQjdcdTVGOTdcdTRFMDBcdTZCMjFcdThDMDNcdTVFQTZcdTY3M0FcdTRGMUFcdUZGMENcdTc4NkVcdTRGRERcdTUyMURcdTU5Q0IgcmVkdWNlciBcdTdCNDlcdTU0MENcdTZCNjVcdTZDRThcdTUxOENcdTVCOENcdTYyMTBcdUZGMENcbiAgICAgIC8vIFx1OTA3Rlx1NTE0RFx1NEUwQVx1NUM0Mlx1RkYwOFx1NTk4MiBSb290IHByb2Nlc3Nlc1x1RkYwOVx1NTcyOFx1OTAzQlx1OEY5MVx1NjcyQVx1NUMzMVx1N0VFQVx1NjVGNlx1NjJBMlx1NTE0OFx1NkQzRVx1NTNEMSBBY3Rpb25cdTMwMDJcbiAgICAgIHlpZWxkKiBFZmZlY3QueWllbGROb3coKVxuICAgIH1cblxuICAgIHJldHVybiBydW50aW1lXG4gIH0pXG5cbiAgcmV0dXJuIHByb2dyYW0gYXMgRWZmZWN0LkVmZmVjdDxQdWJsaWNNb2R1bGVSdW50aW1lPFMsIEE+LCBuZXZlciwgU2NvcGUuU2NvcGUgfCBSPlxufVxuIiwgImltcG9ydCB7IENhdXNlLCBDb250ZXh0LCBFZmZlY3QsIFJlZiB9IGZyb20gXCJlZmZlY3RcIlxuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yQ29udGV4dCB7XG4gIHJlYWRvbmx5IHBoYXNlOiBzdHJpbmdcbiAgcmVhZG9ubHkgbW9kdWxlSWQ/OiBzdHJpbmdcbiAgcmVhZG9ubHkgW2tleTogc3RyaW5nXTogdW5rbm93blxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExpZmVjeWNsZU1hbmFnZXIge1xuICByZWFkb25seSByZWdpc3RlckluaXQ6IChcbiAgICBlZmZlY3Q6IEVmZmVjdC5FZmZlY3Q8dm9pZCwgbmV2ZXIsIGFueT5cbiAgKSA9PiBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+XG4gIHJlYWRvbmx5IHJlZ2lzdGVyRGVzdHJveTogKFxuICAgIGVmZmVjdDogRWZmZWN0LkVmZmVjdDx2b2lkLCBuZXZlciwgYW55PlxuICApID0+IEVmZmVjdC5FZmZlY3Q8dm9pZCwgbmV2ZXIsIGFueT5cbiAgcmVhZG9ubHkgcmVnaXN0ZXJPbkVycm9yOiAoXG4gICAgaGFuZGxlcjogKFxuICAgICAgY2F1c2U6IENhdXNlLkNhdXNlPHVua25vd24+LFxuICAgICAgY29udGV4dDogRXJyb3JDb250ZXh0XG4gICAgKSA9PiBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+XG4gICkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkLCBuZXZlciwgYW55PlxuICByZWFkb25seSBydW5EZXN0cm95OiBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+XG4gIHJlYWRvbmx5IG5vdGlmeUVycm9yOiAoXG4gICAgY2F1c2U6IENhdXNlLkNhdXNlPHVua25vd24+LFxuICAgIGNvbnRleHQ6IEVycm9yQ29udGV4dFxuICApID0+IEVmZmVjdC5FZmZlY3Q8dm9pZCwgbmV2ZXIsIGFueT5cbiAgLyoqXG4gICAqIFx1NjYyRlx1NTQyNlx1NURGMlx1NkNFOFx1NTE4Q1x1NEVGQlx1NjEwRiBvbkVycm9yIFx1NTkwNFx1NzQwNlx1NTY2OFx1MzAwMlxuICAgKiBcdTRFQzVcdTc1MjhcdTRFOEVcdThCQ0FcdTY1QURcdTc2RUVcdTc2ODRcdUZGMENcdTRFMERcdTVGNzFcdTU0Q0RcdTZCNjNcdTVFMzhcdTk1MTlcdThCRUZcdTRGMjBcdTY0QURcdThCRURcdTRFNDlcdTMwMDJcbiAgICovXG4gIHJlYWRvbmx5IGhhc09uRXJyb3JIYW5kbGVyczogRWZmZWN0LkVmZmVjdDxib29sZWFuLCBuZXZlciwgYW55PlxufVxuXG5leHBvcnQgY29uc3QgTGlmZWN5Y2xlQ29udGV4dCA9IENvbnRleHQuR2VuZXJpY1RhZzxMaWZlY3ljbGVNYW5hZ2VyPihcbiAgXCJAbG9naXgvTGlmZWN5Y2xlTWFuYWdlclwiXG4pXG5cbmNvbnN0IHNhZmVSdW4gPSAobGFiZWw6IHN0cmluZywgZWZmOiBFZmZlY3QuRWZmZWN0PHZvaWQsIGFueSwgYW55PikgPT5cbiAgZWZmLnBpcGUoXG4gICAgRWZmZWN0Lm1hdGNoQ2F1c2VFZmZlY3Qoe1xuICAgICAgb25TdWNjZXNzOiAoKSA9PiBFZmZlY3Qudm9pZCxcbiAgICAgIG9uRmFpbHVyZTogKGNhdXNlKSA9PlxuICAgICAgICBFZmZlY3QubG9nRXJyb3IoYFske2xhYmVsfV0gZmFpbGVkOiAke0NhdXNlLnByZXR0eShjYXVzZSl9YCksXG4gICAgfSlcbiAgKVxuXG5leHBvcnQgY29uc3QgbWFrZUxpZmVjeWNsZU1hbmFnZXI6IEVmZmVjdC5FZmZlY3Q8TGlmZWN5Y2xlTWFuYWdlcj4gPSBFZmZlY3QuZ2VuKFxuICBmdW5jdGlvbiogKCkge1xuICAgIGNvbnN0IGRlc3Ryb3lSZWYgPSB5aWVsZCogUmVmLm1ha2U8XG4gICAgICBSZWFkb25seUFycmF5PEVmZmVjdC5FZmZlY3Q8dm9pZCwgbmV2ZXIsIGFueT4+XG4gICAgPihbXSlcbiAgICBjb25zdCBlcnJvclJlZiA9IHlpZWxkKiBSZWYubWFrZTxcbiAgICAgIFJlYWRvbmx5QXJyYXk8XG4gICAgICAgIChcbiAgICAgICAgICBjYXVzZTogQ2F1c2UuQ2F1c2U8dW5rbm93bj4sXG4gICAgICAgICAgY29udGV4dDogRXJyb3JDb250ZXh0XG4gICAgICAgICkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkLCBuZXZlciwgYW55PlxuICAgICAgPlxuICAgID4oW10pXG5cbiAgICBjb25zdCByZWdpc3RlckRlc3Ryb3kgPSAoZWZmZWN0OiBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+KSA9PlxuICAgICAgUmVmLnVwZGF0ZShkZXN0cm95UmVmLCAobGlzdCkgPT4gWy4uLmxpc3QsIGVmZmVjdF0pXG5cbiAgICBjb25zdCByZWdpc3Rlck9uRXJyb3IgPSAoXG4gICAgICBoYW5kbGVyOiAoXG4gICAgICAgIGNhdXNlOiBDYXVzZS5DYXVzZTx1bmtub3duPixcbiAgICAgICAgY29udGV4dDogRXJyb3JDb250ZXh0XG4gICAgICApID0+IEVmZmVjdC5FZmZlY3Q8dm9pZCwgbmV2ZXIsIGFueT5cbiAgICApID0+IFJlZi51cGRhdGUoZXJyb3JSZWYsIChsaXN0KSA9PiBbLi4ubGlzdCwgaGFuZGxlcl0pXG5cbiAgICBjb25zdCBydW5EZXN0cm95ID0gUmVmLmdldChkZXN0cm95UmVmKS5waXBlKFxuICAgICAgRWZmZWN0LmZsYXRNYXAoKGVmZmVjdHMpID0+XG4gICAgICAgIEVmZmVjdC5mb3JFYWNoKGVmZmVjdHMsIChlZmZlY3QpID0+XG4gICAgICAgICAgc2FmZVJ1bihcImxpZmVjeWNsZS5vbkRlc3Ryb3lcIiwgZWZmZWN0KSwgeyBkaXNjYXJkOiB0cnVlIH1cbiAgICAgICAgKVxuICAgICAgKVxuICAgIClcblxuICAgIGNvbnN0IG5vdGlmeUVycm9yID0gKGNhdXNlOiBDYXVzZS5DYXVzZTx1bmtub3duPiwgY29udGV4dDogRXJyb3JDb250ZXh0KSA9PlxuICAgICAgUmVmLmdldChlcnJvclJlZikucGlwZShcbiAgICAgICAgRWZmZWN0LmZsYXRNYXAoKGhhbmRsZXJzKSA9PlxuICAgICAgICAgIEVmZmVjdC5mb3JFYWNoKGhhbmRsZXJzLCAoaGFuZGxlcikgPT5cbiAgICAgICAgICAgIGhhbmRsZXIoY2F1c2UsIGNvbnRleHQpLnBpcGUoXG4gICAgICAgICAgICAgIEVmZmVjdC5jYXRjaEFsbENhdXNlKChpbm5lcikgPT5cbiAgICAgICAgICAgICAgICBFZmZlY3QubG9nRXJyb3IoXG4gICAgICAgICAgICAgICAgICBgW2xpZmVjeWNsZS5vbkVycm9yXSBmYWlsZWQ6ICR7Q2F1c2UucHJldHR5KGlubmVyKX1gXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICApLCB7IGRpc2NhcmQ6IHRydWUgfVxuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgKVxuXG4gICAgY29uc3QgcmVnaXN0ZXJJbml0ID0gKGVmZmVjdDogRWZmZWN0LkVmZmVjdDx2b2lkLCBuZXZlciwgYW55PikgPT5cbiAgICAgIGVmZmVjdC5waXBlKFxuICAgICAgICBFZmZlY3QubWF0Y2hDYXVzZUVmZmVjdCh7XG4gICAgICAgICAgb25TdWNjZXNzOiAoKSA9PiBFZmZlY3Qudm9pZCxcbiAgICAgICAgICBvbkZhaWx1cmU6IChjYXVzZSkgPT5cbiAgICAgICAgICAgIG5vdGlmeUVycm9yKGNhdXNlLCB7IHBoYXNlOiBcImxpZmVjeWNsZS5vbkluaXRcIiB9KS5waXBlKFxuICAgICAgICAgICAgICBFZmZlY3QuemlwUmlnaHQoXG4gICAgICAgICAgICAgICAgRWZmZWN0LmxvZ0Vycm9yKFxuICAgICAgICAgICAgICAgICAgYFtsaWZlY3ljbGUub25Jbml0XSBmYWlsZWQ6ICR7Q2F1c2UucHJldHR5KGNhdXNlKX1gXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICApLFxuICAgICAgICB9KVxuICAgICAgKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZ2lzdGVySW5pdCxcbiAgICAgIHJlZ2lzdGVyRGVzdHJveSxcbiAgICAgIHJlZ2lzdGVyT25FcnJvcixcbiAgICAgIHJ1bkRlc3Ryb3ksXG4gICAgICBub3RpZnlFcnJvcixcbiAgICAgIGhhc09uRXJyb3JIYW5kbGVyczogUmVmLmdldChlcnJvclJlZikucGlwZShcbiAgICAgICAgRWZmZWN0Lm1hcCgoaGFuZGxlcnMpID0+IGhhbmRsZXJzLmxlbmd0aCA+IDApXG4gICAgICApLFxuICAgIH1cbiAgfVxuKVxuIiwgImltcG9ydCB7IENhdXNlLCBFZmZlY3QsIEZpYmVyUmVmLCBMYXllciwgTG9nZ2VyIH0gZnJvbSBcImVmZmVjdFwiXG5cbmV4cG9ydCB0eXBlIEV2ZW50ID1cbiAgfCB7XG4gICAgICByZWFkb25seSB0eXBlOiBcIm1vZHVsZTppbml0XCJcbiAgICAgIHJlYWRvbmx5IG1vZHVsZUlkPzogc3RyaW5nXG4gICAgICByZWFkb25seSBydW50aW1lSWQ/OiBzdHJpbmdcbiAgICAgIHJlYWRvbmx5IHJ1bnRpbWVMYWJlbD86IHN0cmluZ1xuICAgIH1cbiAgfCB7XG4gICAgICByZWFkb25seSB0eXBlOiBcIm1vZHVsZTpkZXN0cm95XCJcbiAgICAgIHJlYWRvbmx5IG1vZHVsZUlkPzogc3RyaW5nXG4gICAgICByZWFkb25seSBydW50aW1lSWQ/OiBzdHJpbmdcbiAgICAgIHJlYWRvbmx5IHJ1bnRpbWVMYWJlbD86IHN0cmluZ1xuICAgIH1cbiAgfCB7XG4gICAgICByZWFkb25seSB0eXBlOiBcImFjdGlvbjpkaXNwYXRjaFwiXG4gICAgICByZWFkb25seSBtb2R1bGVJZD86IHN0cmluZ1xuICAgICAgcmVhZG9ubHkgYWN0aW9uOiB1bmtub3duXG4gICAgICByZWFkb25seSBydW50aW1lSWQ/OiBzdHJpbmdcbiAgICAgIHJlYWRvbmx5IHJ1bnRpbWVMYWJlbD86IHN0cmluZ1xuICAgIH1cbiAgfCB7XG4gICAgICByZWFkb25seSB0eXBlOiBcInN0YXRlOnVwZGF0ZVwiXG4gICAgICByZWFkb25seSBtb2R1bGVJZD86IHN0cmluZ1xuICAgICAgcmVhZG9ubHkgc3RhdGU6IHVua25vd25cbiAgICAgIHJlYWRvbmx5IHJ1bnRpbWVJZD86IHN0cmluZ1xuICAgICAgcmVhZG9ubHkgcnVudGltZUxhYmVsPzogc3RyaW5nXG4gICAgfVxuICB8IHtcbiAgICAgIHJlYWRvbmx5IHR5cGU6IFwibGlmZWN5Y2xlOmVycm9yXCJcbiAgICAgIHJlYWRvbmx5IG1vZHVsZUlkPzogc3RyaW5nXG4gICAgICByZWFkb25seSBjYXVzZTogdW5rbm93blxuICAgICAgcmVhZG9ubHkgcnVudGltZUlkPzogc3RyaW5nXG4gICAgICByZWFkb25seSBydW50aW1lTGFiZWw/OiBzdHJpbmdcbiAgICB9XG4gIHwge1xuICAgICAgcmVhZG9ubHkgdHlwZTogXCJkaWFnbm9zdGljXCJcbiAgICAgIHJlYWRvbmx5IG1vZHVsZUlkPzogc3RyaW5nXG4gICAgICByZWFkb25seSBjb2RlOiBzdHJpbmdcbiAgICAgIHJlYWRvbmx5IHNldmVyaXR5OiBcImVycm9yXCIgfCBcIndhcm5pbmdcIiB8IFwiaW5mb1wiXG4gICAgICByZWFkb25seSBtZXNzYWdlOiBzdHJpbmdcbiAgICAgIHJlYWRvbmx5IGhpbnQ/OiBzdHJpbmdcbiAgICAgIHJlYWRvbmx5IGFjdGlvblRhZz86IHN0cmluZ1xuICAgICAgcmVhZG9ubHkga2luZD86IHN0cmluZ1xuICAgICAgcmVhZG9ubHkgcnVudGltZUlkPzogc3RyaW5nXG4gICAgICByZWFkb25seSBydW50aW1lTGFiZWw/OiBzdHJpbmdcbiAgICB9XG4gIC8qKlxuICAgKiB0cmFjZToqIFx1NEU4Qlx1NEVGNlx1RkYxQVxuICAgKiAtIFx1NEY1Q1x1NEUzQVx1OEZEMFx1ODg0Q1x1NjVGNiB0cmFjZSAvIFBsYXlncm91bmQgLyBBbGlnbm1lbnQgTGFiIFx1NzY4NFx1NjI2OVx1NUM1NVx1OTRBOVx1NUI1MFx1RkYxQlxuICAgKiAtIFx1NUY1M1x1NTI0RFx1NTNFQVx1N0VBNlx1NUI5QSB0eXBlIFx1NTI0RFx1N0YwMFx1NEUwRSBtb2R1bGVJZFx1RkYwQ1x1NTE3N1x1NEY1MyBwYXlsb2FkIFx1N0VEM1x1Njc4NFx1NzUzMVx1NEUwQVx1NUM0Mlx1N0VBNlx1NUI5QVx1RkYwOFx1NEY4Qlx1NTk4MiBkYXRhIFx1NTE4NVx1NjMwMiBzcGFuSWQvYXR0cmlidXRlcyBcdTdCNDlcdUZGMDlcdTMwMDJcbiAgICovXG4gIHwge1xuICAgICAgcmVhZG9ubHkgdHlwZTogYHRyYWNlOiR7c3RyaW5nfWBcbiAgICAgIHJlYWRvbmx5IG1vZHVsZUlkPzogc3RyaW5nXG4gICAgICByZWFkb25seSBkYXRhPzogdW5rbm93blxuICAgICAgcmVhZG9ubHkgcnVudGltZUlkPzogc3RyaW5nXG4gICAgICByZWFkb25seSBydW50aW1lTGFiZWw/OiBzdHJpbmdcbiAgICB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2luayB7XG4gIHJlYWRvbmx5IHJlY29yZDogKGV2ZW50OiBFdmVudCkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkPlxufVxuZXhwb3J0IGNvbnN0IGN1cnJlbnREZWJ1Z1NpbmtzID0gRmliZXJSZWYudW5zYWZlTWFrZTxSZWFkb25seUFycmF5PFNpbms+PihbXSlcbmV4cG9ydCBjb25zdCBjdXJyZW50UnVudGltZUxhYmVsID0gRmliZXJSZWYudW5zYWZlTWFrZTxzdHJpbmcgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZClcblxuLy8gXHU2RDRGXHU4OUM4XHU1NjY4XHU3M0FGXHU1ODgzXHU0RTBCXHVGRjBDXHU0RTNBXHU0RTg2XHU1MUNGXHU1QzExIFJlYWN0IFN0cmljdE1vZGUgXHU3QjQ5XHU1QkZDXHU4MUY0XHU3Njg0XHU5MUNEXHU1OTBEXHU2NUU1XHU1RkQ3XHU1NjZBXHU5N0YzXHVGRjBDXG4vLyBcdTVCRjkgbGlmZWN5Y2xlOmVycm9yIFx1NEUwRSBkaWFnbm9zdGljIFx1NEU4Qlx1NEVGNlx1NTA1QVx1NEUwMFx1NkIyMVx1N0I4MFx1NTM1NVx1NTNCQlx1OTFDRFx1RkYxQVx1NTQwQ1x1NEUwMCBtb2R1bGVJZCtwYXlsb2FkIFx1NTNFQVx1NjI1M1x1NTM3MFx1NEUwMFx1NkIyMVx1MzAwMlxuY29uc3QgYnJvd3NlckxpZmVjeWNsZVNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKVxuY29uc3QgYnJvd3NlckRpYWdub3N0aWNTZWVuID0gbmV3IFNldDxzdHJpbmc+KClcblxuY29uc3QgbGlmZWN5Y2xlRXJyb3JMb2cgPSAoZXZlbnQ6IEV4dHJhY3Q8RXZlbnQsIHsgcmVhZG9ubHkgdHlwZTogXCJsaWZlY3ljbGU6ZXJyb3JcIiB9PikgPT4ge1xuICBjb25zdCBtb2R1bGVJZCA9IGV2ZW50Lm1vZHVsZUlkID8/IFwidW5rbm93blwiXG4gIGNvbnN0IGNhdXNlUHJldHR5ID0gKCgpID0+IHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIENhdXNlLnByZXR0eShldmVudC5jYXVzZSBhcyBDYXVzZS5DYXVzZTx1bmtub3duPiwge1xuICAgICAgICByZW5kZXJFcnJvckNhdXNlOiB0cnVlLFxuICAgICAgfSlcbiAgICB9IGNhdGNoIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShldmVudC5jYXVzZSwgbnVsbCwgMilcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gU3RyaW5nKGV2ZW50LmNhdXNlKVxuICAgICAgfVxuICAgIH1cbiAgfSkoKVxuXG4gIGNvbnN0IG1lc3NhZ2UgPSBgW0xvZ2l4XVttb2R1bGU9JHttb2R1bGVJZH1dIGxpZmVjeWNsZTplcnJvclxcbiR7Y2F1c2VQcmV0dHl9YFxuXG4gIHJldHVybiBFZmZlY3QubG9nRXJyb3IobWVzc2FnZSkucGlwZShcbiAgICBFZmZlY3QuYW5ub3RhdGVMb2dzKHtcbiAgICAgIFwibG9naXgubW9kdWxlSWRcIjogbW9kdWxlSWQsXG4gICAgICBcImxvZ2l4LmV2ZW50XCI6IFwibGlmZWN5Y2xlOmVycm9yXCIsXG4gICAgICBcImxvZ2l4LmNhdXNlXCI6IGNhdXNlUHJldHR5LFxuICAgIH0pLFxuICApXG59XG5cbmNvbnN0IGRpYWdub3N0aWNMb2cgPSAoZXZlbnQ6IEV4dHJhY3Q8RXZlbnQsIHsgcmVhZG9ubHkgdHlwZTogXCJkaWFnbm9zdGljXCIgfT4pID0+IHtcbiAgY29uc3QgbW9kdWxlSWQgPSBldmVudC5tb2R1bGVJZCA/PyBcInVua25vd25cIlxuICBjb25zdCBoZWFkZXIgPSBgW0xvZ2l4XVttb2R1bGU9JHttb2R1bGVJZH1dIGRpYWdub3N0aWMoJHtldmVudC5zZXZlcml0eX0pYFxuICBjb25zdCBkZXRhaWwgPSBgY29kZT0ke2V2ZW50LmNvZGV9IG1lc3NhZ2U9JHtldmVudC5tZXNzYWdlfSR7XG4gICAgZXZlbnQuYWN0aW9uVGFnID8gYCBhY3Rpb249JHtldmVudC5hY3Rpb25UYWd9YCA6IFwiXCJcbiAgfSR7ZXZlbnQuaGludCA/IGBcXG5oaW50OiAke2V2ZW50LmhpbnR9YCA6IFwiXCJ9YFxuICBjb25zdCBtc2cgPSBgJHtoZWFkZXJ9XFxuJHtkZXRhaWx9YFxuXG4gIGNvbnN0IGJhc2UgPVxuICAgIGV2ZW50LnNldmVyaXR5ID09PSBcIndhcm5pbmdcIlxuICAgICAgPyBFZmZlY3QubG9nV2FybmluZyhtc2cpXG4gICAgICA6IGV2ZW50LnNldmVyaXR5ID09PSBcImluZm9cIlxuICAgICAgICA/IEVmZmVjdC5sb2dJbmZvKG1zZylcbiAgICAgICAgOiBFZmZlY3QubG9nRXJyb3IobXNnKVxuXG4gIGNvbnN0IGFubm90YXRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHtcbiAgICBcImxvZ2l4Lm1vZHVsZUlkXCI6IG1vZHVsZUlkLFxuICAgIFwibG9naXguZXZlbnRcIjogYGRpYWdub3N0aWMoJHtldmVudC5zZXZlcml0eX0pYCxcbiAgICBcImxvZ2l4LmRpYWdub3N0aWMuY29kZVwiOiBldmVudC5jb2RlLFxuICAgIFwibG9naXguZGlhZ25vc3RpYy5tZXNzYWdlXCI6IGV2ZW50Lm1lc3NhZ2UsXG4gIH1cbiAgaWYgKGV2ZW50LmhpbnQpIHtcbiAgICBhbm5vdGF0aW9uc1tcImxvZ2l4LmRpYWdub3N0aWMuaGludFwiXSA9IGV2ZW50LmhpbnRcbiAgfVxuICBpZiAoZXZlbnQuYWN0aW9uVGFnKSB7XG4gICAgYW5ub3RhdGlvbnNbXCJsb2dpeC5kaWFnbm9zdGljLmFjdGlvblRhZ1wiXSA9IGV2ZW50LmFjdGlvblRhZ1xuICB9XG5cbiAgcmV0dXJuIGJhc2UucGlwZShFZmZlY3QuYW5ub3RhdGVMb2dzKGFubm90YXRpb25zKSlcbn1cblxuLyoqXG4gKiBcdTU3RkFcdTRFOEUgRmliZXJSZWYuY3VycmVudERlYnVnU2lua3MgXHU3Njg0XHU5RUQ4XHU4QkE0IExheWVyIFx1N0VDNFx1NTQwOFx1RkYxQVxuICogLSBcdTRGN0ZcdTc1MjggTGF5ZXIubG9jYWxseVNjb3BlZCBcdTc4NkVcdTRGREQgRGVidWcgc2lua3MgXHU0RjVDXHU0RTNBIEZpYmVyUmVmIFx1NzJCNlx1NjAwMVx1NkNFOFx1NTE2NVx1RkYwQ1xuICogLSBcdTRFMERcdTUxOERcdTVDMDYgRmliZXJSZWYgXHU4QkVGXHU3NTI4XHU0RTNBIENvbnRleHQuVGFnXHUzMDAyXG4gKi9cbmV4cG9ydCBjb25zdCBub29wTGF5ZXIgPSBMYXllci5sb2NhbGx5U2NvcGVkKGN1cnJlbnREZWJ1Z1NpbmtzLCBbXSlcblxuLyoqXG4gKiBlcnJvck9ubHlMYXllclx1RkYxQVxuICogLSBcdTlFRDhcdThCQTRcdTc2ODQgRGVidWdTaW5rIFx1NUI5RVx1NzNCMFx1RkYwQ1x1NEVDNVx1NTE3M1x1NUZDMyBsaWZlY3ljbGU6ZXJyb3IgXHU0RThCXHU0RUY2XHVGRjFCXG4gKiAtIFx1OTAwMlx1NTQwOFx1NEY1Q1x1NEUzQSBSdW50aW1lIFx1NzY4NFx1MjAxQ1x1NjcwMFx1NEY0RVx1OTY1MFx1NUVBNlx1ODlDMlx1NkQ0Qlx1MjAxRFx1NUM0Mlx1RkYwQ1x1NEZERFx1OEJDMVx1ODFGNFx1NTQ3RFx1OTUxOVx1OEJFRlx1NEUwRFx1NEYxQVx1NjA4NFx1NzEzNlx1NkQ4OFx1NTkzMVx1RkYxQlxuICogLSBcdTUxNzZcdTRFRDZcdTRFOEJcdTRFRjZcdUZGMDhtb2R1bGU6aW5pdC9kZXN0cm95XHUzMDAxYWN0aW9uOmRpc3BhdGNoXHUzMDAxc3RhdGU6dXBkYXRlXHVGRjA5XHU5RUQ4XHU4QkE0XHU0RTBEXHU4QkIwXHU1RjU1XHUzMDAyXG4gKi9cbmNvbnN0IGVycm9yT25seVNpbms6IFNpbmsgPSB7XG4gIHJlY29yZDogKGV2ZW50OiBFdmVudCkgPT5cbiAgICBldmVudC50eXBlID09PSBcImxpZmVjeWNsZTplcnJvclwiXG4gICAgICA/IGxpZmVjeWNsZUVycm9yTG9nKGV2ZW50KVxuICAgICAgOiBldmVudC50eXBlID09PSBcImRpYWdub3N0aWNcIiAmJiBldmVudC5zZXZlcml0eSAhPT0gXCJpbmZvXCJcbiAgICAgICAgPyBkaWFnbm9zdGljTG9nKGV2ZW50KVxuICAgICAgICA6IEVmZmVjdC52b2lkLFxufVxuXG5leHBvcnQgY29uc3QgZXJyb3JPbmx5TGF5ZXIgPSBMYXllci5sb2NhbGx5U2NvcGVkKGN1cnJlbnREZWJ1Z1NpbmtzLCBbZXJyb3JPbmx5U2lua10pXG5cbi8qKlxuICogY29uc29sZUxheWVyXHVGRjFBXG4gKiAtIFx1NTE2OFx1OTFDRlx1OEMwM1x1OEJENVx1NUM0Mlx1RkYwQ1x1NUMwNlx1NjI0MFx1NjcwOSBEZWJ1ZyBcdTRFOEJcdTRFRjZcdTRFRTUgRWZmZWN0IFx1NjVFNVx1NUZEN1x1NUY2Mlx1NUYwRlx1OEY5M1x1NTFGQVx1RkYwOGxvZ2ZtdCAvIHN0cnVjdHVyZWRcdUZGMDlcdUZGMENcbiAqIC0gXHU5MDAyXHU1NDA4XHU0RjVDXHU0RTNBXHU5MDFBXHU3NTI4XHU3M0FGXHU1ODgzXHVGRjA4Tm9kZSAvIFx1NkQ0Qlx1OEJENVx1NzNBRlx1NTg4M1x1RkYwOVx1NzY4NFx1ODlDMlx1NkQ0Qlx1NUM0Mlx1MzAwMlxuICovXG5jb25zdCBjb25zb2xlU2luazogU2luayA9IHtcbiAgcmVjb3JkOiAoZXZlbnQ6IEV2ZW50KSA9PlxuICAgIGV2ZW50LnR5cGUgPT09IFwibGlmZWN5Y2xlOmVycm9yXCJcbiAgICAgID8gbGlmZWN5Y2xlRXJyb3JMb2coZXZlbnQpXG4gICAgICA6IGV2ZW50LnR5cGUgPT09IFwiZGlhZ25vc3RpY1wiXG4gICAgICAgID8gZGlhZ25vc3RpY0xvZyhldmVudClcbiAgICAgICAgOiBFZmZlY3QubG9nRGVidWcoeyBkZWJ1Z0V2ZW50OiBldmVudCB9KSxcbn1cblxuZXhwb3J0IGNvbnN0IGNvbnNvbGVMYXllciA9IExheWVyLmxvY2FsbHlTY29wZWQoY3VycmVudERlYnVnU2lua3MsIFtjb25zb2xlU2lua10pXG5cbmNvbnN0IGlzQnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiXG5cbi8vIFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NzNBRlx1NTg4M1x1NEUwQlx1N0VERlx1NEUwMFx1NzY4NCBDb25zb2xlIFx1NkUzMlx1NjdEM1x1OTAzQlx1OEY5MVx1RkYwQ1x1NzUyOFx1NEU4RSBEZWJ1Z1NpbmsgXHU3RjNBXHU3NzAxXHU1QjlFXHU3M0IwXHU0RTBFIGJyb3dzZXJDb25zb2xlTGF5ZXJcdTMwMDJcbmNvbnN0IHJlbmRlckJyb3dzZXJDb25zb2xlRXZlbnQgPSAoZXZlbnQ6IEV2ZW50KTogRWZmZWN0LkVmZmVjdDx2b2lkPiA9PiB7XG4gIC8vIHRyYWNlOiogXHU0RThCXHU0RUY2XHVGRjFBXHU1NzI4XHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU0RUU1XHU3MkVDXHU3QUNCXHU1MjA2XHU3RUM0XHU1QzU1XHU3OTNBXHVGRjBDXHU0RkJGXHU0RThFIFBsYXlncm91bmQgLyBEZXZUb29scyBcdTg5QzJcdTZENEJcdTMwMDJcbiAgaWYgKHR5cGVvZiAoZXZlbnQgYXMgYW55KS50eXBlID09PSBcInN0cmluZ1wiICYmIChldmVudCBhcyBhbnkpLnR5cGUuc3RhcnRzV2l0aChcInRyYWNlOlwiKSkge1xuICAgIGNvbnN0IG1vZHVsZUlkID0gKGV2ZW50IGFzIGFueSkubW9kdWxlSWQgPz8gXCJ1bmtub3duXCJcbiAgICBjb25zdCB0eXBlID0gKGV2ZW50IGFzIGFueSkudHlwZVxuXG4gICAgcmV0dXJuIEVmZmVjdC5zeW5jKCgpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmdyb3VwQ29sbGFwc2VkKFxuICAgICAgICBcIiVjW0xvZ2l4XSVjIHRyYWNlICVjXCIgKyBtb2R1bGVJZCArIFwiJWMgXCIgKyBTdHJpbmcodHlwZSksXG4gICAgICAgIFwiY29sb3I6IzZiNzI4MDtmb250LXdlaWdodDpib2xkXCIsIC8vIHRhZ1xuICAgICAgICBcImNvbG9yOiMzYjgyZjZcIiwgLy8gbGFiZWxcbiAgICAgICAgXCJjb2xvcjojOWNhM2FmXCIsIC8vIG1vZHVsZSBpZFxuICAgICAgICBcImNvbG9yOiM2YjcyODBcIiwgLy8gdHlwZVxuICAgICAgKVxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGV2ZW50KVxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZ3JvdXBFbmQoKVxuICAgIH0pXG4gIH1cblxuICBpZiAoZXZlbnQudHlwZSA9PT0gXCJsaWZlY3ljbGU6ZXJyb3JcIikge1xuICAgIGNvbnN0IG1vZHVsZUlkID0gZXZlbnQubW9kdWxlSWQgPz8gXCJ1bmtub3duXCJcbiAgICBjb25zdCBjYXVzZVByZXR0eSA9ICgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gQ2F1c2UucHJldHR5KGV2ZW50LmNhdXNlIGFzIENhdXNlLkNhdXNlPHVua25vd24+LCB7IHJlbmRlckVycm9yQ2F1c2U6IHRydWUgfSlcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShldmVudC5jYXVzZSwgbnVsbCwgMilcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBTdHJpbmcoZXZlbnQuY2F1c2UpXG4gICAgICB9XG4gICAgfVxuICB9KSgpXG5cbiAgICBjb25zdCBrZXkgPSBgJHttb2R1bGVJZH18JHtjYXVzZVByZXR0eX1gXG4gICAgaWYgKGJyb3dzZXJMaWZlY3ljbGVTZWVuLmhhcyhrZXkpKSB7XG4gICAgICByZXR1cm4gRWZmZWN0LnZvaWRcbiAgICB9XG4gICAgYnJvd3NlckxpZmVjeWNsZVNlZW4uYWRkKGtleSlcblxuICAgIHJldHVybiBFZmZlY3Quc3luYygoKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5ncm91cENvbGxhcHNlZChcbiAgICAgICAgXCIlY1tMb2dpeF0lYyBsaWZlY3ljbGU6ZXJyb3IgJWNcIiArIG1vZHVsZUlkLFxuICAgICAgICBcImNvbG9yOiNlZjQ0NDQ7Zm9udC13ZWlnaHQ6Ym9sZFwiLCAvLyB0YWdcbiAgICAgICAgXCJjb2xvcjojZWY0NDQ0XCIsIC8vIGxhYmVsXG4gICAgICAgIFwiY29sb3I6IzljYTNhZlwiLCAvLyBtb2R1bGUgaWRcbiAgICAgIClcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGNhdXNlUHJldHR5KVxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZ3JvdXBFbmQoKVxuICAgIH0pXG4gIH1cblxuICBpZiAoZXZlbnQudHlwZSA9PT0gXCJkaWFnbm9zdGljXCIpIHtcbiAgICBjb25zdCBtb2R1bGVJZCA9IGV2ZW50Lm1vZHVsZUlkID8/IFwidW5rbm93blwiXG4gICAgY29uc3QgZGV0YWlsID0gYGNvZGU9JHtldmVudC5jb2RlfSBtZXNzYWdlPSR7ZXZlbnQubWVzc2FnZX0ke1xuICAgICAgZXZlbnQuYWN0aW9uVGFnID8gYCBhY3Rpb249JHtldmVudC5hY3Rpb25UYWd9YCA6IFwiXCJcbiAgICB9JHtldmVudC5oaW50ID8gYFxcbmhpbnQ6ICR7ZXZlbnQuaGludH1gIDogXCJcIn1gXG5cbiAgICBjb25zdCBjb2xvciA9XG4gICAgICBldmVudC5zZXZlcml0eSA9PT0gXCJ3YXJuaW5nXCJcbiAgICAgICAgPyBcImNvbG9yOiNkOTc3MDZcIlxuICAgICAgICA6IGV2ZW50LnNldmVyaXR5ID09PSBcImluZm9cIlxuICAgICAgICAgID8gXCJjb2xvcjojM2I4MmY2XCJcbiAgICAgICAgICA6IFwiY29sb3I6I2VmNDQ0NFwiXG5cbiAgICBjb25zdCBsYWJlbCA9XG4gICAgICBldmVudC5zZXZlcml0eSA9PT0gXCJ3YXJuaW5nXCJcbiAgICAgICAgPyBcImRpYWdub3N0aWMod2FybmluZylcIlxuICAgICAgICA6IGV2ZW50LnNldmVyaXR5ID09PSBcImluZm9cIlxuICAgICAgICAgID8gXCJkaWFnbm9zdGljKGluZm8pXCJcbiAgICAgICAgICA6IFwiZGlhZ25vc3RpYyhlcnJvcilcIlxuXG4gICAgY29uc3Qga2V5ID0gYCR7bW9kdWxlSWR9fCR7ZXZlbnQuY29kZX18JHtldmVudC5tZXNzYWdlfWBcbiAgICBpZiAoYnJvd3NlckRpYWdub3N0aWNTZWVuLmhhcyhrZXkpKSB7XG4gICAgICByZXR1cm4gRWZmZWN0LnZvaWRcbiAgICB9XG4gICAgYnJvd3NlckRpYWdub3N0aWNTZWVuLmFkZChrZXkpXG5cbiAgICByZXR1cm4gRWZmZWN0LnN5bmMoKCkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZ3JvdXBDb2xsYXBzZWQoXG4gICAgICAgIFwiJWNbTG9naXhdJWMgXCIgKyBsYWJlbCArIFwiJWMgbW9kdWxlPVwiICsgbW9kdWxlSWQsXG4gICAgICAgIFwiY29sb3I6IzZiNzI4MDtmb250LXdlaWdodDpib2xkXCIsXG4gICAgICAgIGNvbG9yLFxuICAgICAgICBcImNvbG9yOiM5Y2EzYWZcIixcbiAgICAgIClcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhkZXRhaWwpXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5ncm91cEVuZCgpXG4gICAgfSlcbiAgfVxuXG4gIC8vIFx1NTE3Nlx1NEVENlx1NEU4Qlx1NEVGNlx1RkYxQVx1OUVEOFx1OEJBNFx1NEUwRFx1NTcyOFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NjNBN1x1NTIzNlx1NTNGMFx1OEY5M1x1NTFGQVx1RkYwQ1x1NEVFNVx1NTE0RFx1NTcyOFx1NEUxQVx1NTJBMVx1NUYwMFx1NTNEMVx1NTczQVx1NjY2Rlx1NEUyRFx1OEZDN1x1NEU4RVx1NTQzNVx1OTVGOVx1RkYxQlxuICAvLyBcdTU5ODJcdTk3MDBcdTY3RTVcdTc3MEJcdTUxODVcdTkwRThcdThDMDNcdThCRDVcdTRFOEJcdTRFRjZcdUZGMENcdTUzRUZcdTkwMUFcdThGQzdcdTgxRUFcdTVCOUFcdTRFNDkgRGVidWcgU2luayBcdTYyMTZcdTU3MjggTm9kZSBcdTczQUZcdTU4ODNcdTRFMEJcdTRGN0ZcdTc1MjggY29uc29sZUxheWVyXHUzMDAyXG4gIHJldHVybiBFZmZlY3Qudm9pZFxufVxuXG4vKipcbiAqIFx1NkQ0Rlx1ODlDOFx1NTY2OCBDb25zb2xlIFx1OEMwM1x1OEJENVx1NUM0Mlx1RkYxQVxuICogLSBcdTU3MjhcdTZENEZcdTg5QzhcdTU2NjhcdTczQUZcdTU4ODNcdTRFMEJcdTRGN0ZcdTc1MjggY29uc29sZS5ncm91cENvbGxhcHNlZCArIFx1NUY2OVx1ODI3MiBsYWJlbCBcdTZBMjFcdTYyREYgcHJldHR5IGxvZ2dlciBcdTc2ODRcdTUyMDZcdTdFQzRcdTY1NDhcdTY3OUNcdUZGMUJcbiAqIC0gXHU1NzI4XHU5NzVFXHU2RDRGXHU4OUM4XHU1NjY4XHU3M0FGXHU1ODgzXHU0RTBCXHU1NkRFXHU5MDAwXHU1MjMwIGNvbnNvbGVMYXllciBcdTc2ODQgRWZmZWN0IFx1NjVFNVx1NUZEN1x1NUI5RVx1NzNCMFx1MzAwMlxuICovXG5jb25zdCBicm93c2VyQ29uc29sZVNpbms6IFNpbmsgPSB7XG4gIHJlY29yZDogKGV2ZW50OiBFdmVudCkgPT4ge1xuICAgIGlmICghaXNCcm93c2VyKSB7XG4gICAgICAvLyBcdTk3NUVcdTZENEZcdTg5QzhcdTU2NjhcdTczQUZcdTU4ODNcdUZGMUFcdTkwMDBcdTU2REVcdTUyMzAgRWZmZWN0LmxvZyogXHU3Njg0IGNvbnNvbGVMYXllciBcdTg4NENcdTRFM0FcbiAgICAgIHJldHVybiBldmVudC50eXBlID09PSBcImxpZmVjeWNsZTplcnJvclwiXG4gICAgICAgID8gbGlmZWN5Y2xlRXJyb3JMb2coZXZlbnQpXG4gICAgICAgIDogZXZlbnQudHlwZSA9PT0gXCJkaWFnbm9zdGljXCJcbiAgICAgICAgICA/IGRpYWdub3N0aWNMb2coZXZlbnQpXG4gICAgICAgICAgOiBFZmZlY3QubG9nRGVidWcoeyBkZWJ1Z0V2ZW50OiBldmVudCB9KVxuICAgIH1cblxuICAgIHJldHVybiByZW5kZXJCcm93c2VyQ29uc29sZUV2ZW50KGV2ZW50KVxuICB9LFxufVxuXG5leHBvcnQgY29uc3QgYnJvd3NlckNvbnNvbGVMYXllciA9IExheWVyLmxvY2FsbHlTY29wZWQoY3VycmVudERlYnVnU2lua3MsIFticm93c2VyQ29uc29sZVNpbmtdKVxuXG4vKipcbiAqIFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NTNDQlx1NTk3RFx1NzY4NCBMb2dnZXIgXHU1QzQyXHVGRjFBXHU0RjdGXHU3NTI4IEVmZmVjdCBcdTVCOThcdTY1QjlcdTc2ODQgcHJldHR5IGxvZ2dlclx1RkYwOGJyb3dzZXIgXHU2QTIxXHU1RjBGXHVGRjA5XHU2NkZGXHU2MzYyXHU5RUQ4XHU4QkE0IGxvZ2dlclx1MzAwMlxuICogLSBcdTRFMERcdTUxOERcdTYyNEJcdTUxOTkgY29uc29sZSBcdTY4MzdcdTVGMEZcdUZGMENcdTc2RjRcdTYzQTVcdTU5MERcdTc1MjggRWZmZWN0IFx1NzY4NFx1NUY2OVx1ODI3Mi9cdTUyMDZcdTdFQzRcdTY4M0NcdTVGMEZcdUZGMUJcbiAqIC0gXHU1NzI4XHU2NzBEXHU1MkExXHU3QUVGXHU3M0FGXHU1ODgzXHU0RTBCXHU0RTVGXHU4MEZEXHU1Qjg5XHU1MTY4XHU5MDAwXHU1MzE2XHU0RTNBXHU5RUQ4XHU4QkE0IGxvZ2dlclx1MzAwMlxuICovXG5leHBvcnQgY29uc3QgYnJvd3NlclByZXR0eUxvZ2dlckxheWVyID0gTG9nZ2VyLnJlcGxhY2UoXG4gIExvZ2dlci5kZWZhdWx0TG9nZ2VyLFxuICBMb2dnZXIucHJldHR5TG9nZ2VyKHsgbW9kZTogXCJicm93c2VyXCIsIGNvbG9yczogdHJ1ZSB9KVxuKVxuXG4vKipcbiAqIGRlZmF1bHRMYXllclx1RkYxQVxuICogLSBcdTUxNkNcdTUxNzFcdTlFRDhcdThCQTRcdTVDNDJcdUZGMENcdTVGNTNcdTUyNERcdTdCNDlcdTU0MENcdTRFOEUgZXJyb3JPbmx5TGF5ZXJcdUZGMUJcbiAqIC0gXHU0RUM1XHU4QkIwXHU1RjU1IGxpZmVjeWNsZTplcnJvclx1RkYwQ1x1OTA3Rlx1NTE0RFx1NTcyOFx1OUVEOFx1OEJBNFx1NjBDNVx1NTFCNVx1NEUwQlx1NUJGOSBhY3Rpb24vc3RhdGUgXHU2MjUzXHU1MzcwXHU1OTI3XHU5MUNGXHU2NUU1XHU1RkQ3XHUzMDAyXG4gKi9cbmV4cG9ydCBjb25zdCBkZWZhdWx0TGF5ZXIgPSBlcnJvck9ubHlMYXllclxuXG5leHBvcnQgY29uc3QgcmVjb3JkID0gKGV2ZW50OiBFdmVudCkgPT5cbiAgRWZmZWN0LmdlbihmdW5jdGlvbiogKCkge1xuICAgIGNvbnN0IHNpbmtzID0geWllbGQqIEZpYmVyUmVmLmdldChjdXJyZW50RGVidWdTaW5rcylcbiAgICBjb25zdCBydW50aW1lTGFiZWwgPSB5aWVsZCogRmliZXJSZWYuZ2V0KGN1cnJlbnRSdW50aW1lTGFiZWwpXG5cbiAgICBjb25zdCBlbnJpY2hlZDogRXZlbnQgPVxuICAgICAgcnVudGltZUxhYmVsICYmIGV2ZW50LnJ1bnRpbWVMYWJlbCA9PT0gdW5kZWZpbmVkXG4gICAgICAgID8gKHsgLi4uZXZlbnQsIHJ1bnRpbWVMYWJlbCB9IGFzIEV2ZW50KVxuICAgICAgICA6IGV2ZW50XG5cbiAgICBpZiAoc2lua3MubGVuZ3RoID4gMCkge1xuICAgICAgeWllbGQqIEVmZmVjdC5mb3JFYWNoKFxuICAgICAgICBzaW5rcyxcbiAgICAgICAgKHNpbmspID0+IHNpbmsucmVjb3JkKGVucmljaGVkKSxcbiAgICAgICAge1xuICAgICAgICAgIGRpc2NhcmQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICApXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAoaXNCcm93c2VyKSB7XG4gICAgICB5aWVsZCogcmVuZGVyQnJvd3NlckNvbnNvbGVFdmVudChlbnJpY2hlZClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoZW5yaWNoZWQudHlwZSA9PT0gXCJsaWZlY3ljbGU6ZXJyb3JcIikge1xuICAgICAgeWllbGQqIGxpZmVjeWNsZUVycm9yTG9nKGVucmljaGVkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmIChlbnJpY2hlZC50eXBlID09PSBcImRpYWdub3N0aWNcIikge1xuICAgICAgeWllbGQqIGRpYWdub3N0aWNMb2coZW5yaWNoZWQpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgeWllbGQqIEVmZmVjdC52b2lkXG4gIH0pXG4iLCAiaW1wb3J0IHsgQ2F1c2UsIENodW5rLCBFZmZlY3QgfSBmcm9tIFwiZWZmZWN0XCJcbmltcG9ydCAqIGFzIERlYnVnIGZyb20gXCIuL0RlYnVnU2luay5qc1wiXG5cbi8qKlxuICogUmVkdWNlciBcdTc2RjhcdTUxNzNcdTc2ODRcdThCQ0FcdTY1QURcdTk1MTlcdThCRUZcdTdDN0JcdTU3OEJcdUZGMUFcbiAqIC0gUmVkdWNlckR1cGxpY2F0ZUVycm9yXHVGRjFBXHU1NDBDXHU0RTAwXHU0RTJBIHRhZyBcdTZDRThcdTUxOENcdTRFODZcdTU5MUFcdTRFMkEgcHJpbWFyeSByZWR1Y2VyXHVGRjFCXG4gKiAtIFJlZHVjZXJMYXRlUmVnaXN0cmF0aW9uRXJyb3JcdUZGMUFcdTU3MjhcdThCRTUgdGFnIFx1NURGMlx1N0VDRlx1NTNEMVx1NzUxRlx1OEZDNyBkaXNwYXRjaCBcdTRFNEJcdTU0MEVcdTYyNERcdTZDRThcdTUxOEMgcmVkdWNlclx1MzAwMlxuICpcbiAqIFx1OEZEOVx1NEU5Qlx1OTUxOVx1OEJFRlx1NTNFQVx1NTcyOCBSdW50aW1lIFx1NTE4NVx1OTBFOFx1NEY3Rlx1NzUyOFx1RkYwQ1x1NzUyOFx1NEU4RVx1NTcyOCBjYXRjaCBcdTk2MzZcdTZCQjVcdTdFREZcdTRFMDBcdThGNkNcdTYzNjJcdTRFM0EgRGVidWcgXHU4QkNBXHU2NUFEXHU0RThCXHU0RUY2XHUzMDAyXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVkdWNlckRpYWdub3N0aWNFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcmVhZG9ubHkgX3RhZzogXCJSZWR1Y2VyRHVwbGljYXRlRXJyb3JcIiB8IFwiUmVkdWNlckxhdGVSZWdpc3RyYXRpb25FcnJvclwiXG4gIHJlYWRvbmx5IHRhZzogc3RyaW5nXG4gIHJlYWRvbmx5IG1vZHVsZUlkPzogc3RyaW5nXG59XG5cbmV4cG9ydCBjb25zdCBtYWtlUmVkdWNlckVycm9yID0gKFxuICBfdGFnOiBSZWR1Y2VyRGlhZ25vc3RpY0Vycm9yW1wiX3RhZ1wiXSxcbiAgdGFnOiBzdHJpbmcsXG4gIG1vZHVsZUlkPzogc3RyaW5nXG4pOiBSZWR1Y2VyRGlhZ25vc3RpY0Vycm9yID0+XG4gIE9iamVjdC5hc3NpZ24oXG4gICAgbmV3IEVycm9yKFxuICAgICAgX3RhZyA9PT0gXCJSZWR1Y2VyRHVwbGljYXRlRXJyb3JcIlxuICAgICAgICA/IGBbTW9kdWxlUnVudGltZV0gRHVwbGljYXRlIHByaW1hcnkgcmVkdWNlciBmb3IgdGFnIFwiJHt0YWd9XCIuIEVhY2ggYWN0aW9uIHRhZyBtdXN0IGhhdmUgYXQgbW9zdCBvbmUgcHJpbWFyeSByZWR1Y2VyLmBcbiAgICAgICAgOiBgW01vZHVsZVJ1bnRpbWVdIExhdGUgcHJpbWFyeSByZWR1Y2VyIHJlZ2lzdHJhdGlvbiBmb3IgdGFnIFwiJHt0YWd9XCIuIFJlZHVjZXJzIG11c3QgYmUgcmVnaXN0ZXJlZCBiZWZvcmUgdGhlIGZpcnN0IGRpc3BhdGNoIG9mIHRoaXMgdGFnLmBcbiAgICApLFxuICAgIHtcbiAgICAgIF90YWcsXG4gICAgICB0YWcsXG4gICAgICBtb2R1bGVJZCxcbiAgICB9XG4gICkgYXMgUmVkdWNlckRpYWdub3N0aWNFcnJvclxuXG4vKipcbiAqIFx1NEVDRSBMb2dpYyBmb3JrIFx1NzY4NCBDYXVzZSBcdTRFMkRcdTYzRDBcdTUzRDYgUmVkdWNlciBcdThCQ0FcdTY1QURcdTk1MTlcdThCRUZcdUZGMENcdTVFNzZcdTRFRTUgRGVidWcgXHU0RThCXHU0RUY2XHU1RjYyXHU1RjBGXHU1M0QxXHU1MUZBXHUzMDAyXG4gKlxuICogXHU2Q0U4XHU2MTBGXHVGRjFBXG4gKiAtIFx1NEVDNVx1NTcyOFx1NUI1OFx1NTcyOCBSZWR1Y2VyRGlhZ25vc3RpY0Vycm9yIFx1NjVGNlx1NTNEMVx1NTFGQSBkaWFnbm9zdGljIFx1NEU4Qlx1NEVGNlx1RkYxQlxuICogLSBtb2R1bGVJZCBcdTRGMThcdTUxNDhcdTUzRDZcdTk1MTlcdThCRUZcdTVCRjlcdThDNjFcdTgxRUFcdThFQUJcdTc2ODQgbW9kdWxlSWRcdUZGMENcdTUxNzZcdTZCMjFcdTRGN0ZcdTc1MjhcdThDMDNcdTc1MjhcdTY1QjlcdTYzRDBcdTRGOUJcdTc2ODRcdTRFMEFcdTRFMEJcdTY1ODcgbW9kdWxlSWRcdTMwMDJcbiAqL1xuZXhwb3J0IGNvbnN0IGVtaXREaWFnbm9zdGljc0Zyb21DYXVzZSA9IChcbiAgY2F1c2U6IENhdXNlLkNhdXNlPHVua25vd24+LFxuICBtb2R1bGVJZEZyb21Db250ZXh0Pzogc3RyaW5nXG4pOiBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+ID0+XG4gIEVmZmVjdC5zeW5jKCgpID0+IHtcbiAgICBjb25zdCBkZWZlY3RzID0gQ2h1bmsudG9SZWFkb25seUFycmF5KENhdXNlLmRlZmVjdHMoY2F1c2UpKVxuXG4gICAgbGV0IGR1cGxpY2F0ZTogUmVkdWNlckRpYWdub3N0aWNFcnJvciB8IHVuZGVmaW5lZFxuICAgIGxldCBsYXRlOiBSZWR1Y2VyRGlhZ25vc3RpY0Vycm9yIHwgdW5kZWZpbmVkXG5cbiAgICBmb3IgKGNvbnN0IGRlZmVjdCBvZiBkZWZlY3RzKSB7XG4gICAgICBpZiAoIWRlZmVjdCB8fCB0eXBlb2YgZGVmZWN0ICE9PSBcIm9iamVjdFwiKSBjb250aW51ZVxuICAgICAgY29uc3QgZXJyb3IgPSBkZWZlY3QgYXMgYW55XG4gICAgICBpZiAoZXJyb3IuX3RhZyA9PT0gXCJSZWR1Y2VyRHVwbGljYXRlRXJyb3JcIikge1xuICAgICAgICBkdXBsaWNhdGUgPSBlcnJvciBhcyBSZWR1Y2VyRGlhZ25vc3RpY0Vycm9yXG4gICAgICB9IGVsc2UgaWYgKGVycm9yLl90YWcgPT09IFwiUmVkdWNlckxhdGVSZWdpc3RyYXRpb25FcnJvclwiKSB7XG4gICAgICAgIGxhdGUgPSBlcnJvciBhcyBSZWR1Y2VyRGlhZ25vc3RpY0Vycm9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZWZmZWN0czogQXJyYXk8RWZmZWN0LkVmZmVjdDx2b2lkPj4gPSBbXVxuXG4gICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgZWZmZWN0cy5wdXNoKFxuICAgICAgICBEZWJ1Zy5yZWNvcmQoe1xuICAgICAgICAgIHR5cGU6IFwiZGlhZ25vc3RpY1wiLFxuICAgICAgICAgIG1vZHVsZUlkOiBkdXBsaWNhdGUubW9kdWxlSWQgPz8gbW9kdWxlSWRGcm9tQ29udGV4dCxcbiAgICAgICAgICBjb2RlOiBcInJlZHVjZXI6OmR1cGxpY2F0ZVwiLFxuICAgICAgICAgIHNldmVyaXR5OiBcImVycm9yXCIsXG4gICAgICAgICAgbWVzc2FnZTogYFByaW1hcnkgcmVkdWNlciBmb3IgdGFnIFwiJHtkdXBsaWNhdGUudGFnfVwiIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCBhbmQgY2Fubm90IGJlIHJlZGVmaW5lZC5gLFxuICAgICAgICAgIGhpbnQ6XG4gICAgICAgICAgICBcIlx1Nzg2RVx1NEZERFx1NkJDRlx1NEUyQSBBY3Rpb24gVGFnIFx1NEVDNVx1NUI5QVx1NEU0OVx1NEUwMFx1NEUyQSBwcmltYXJ5IHJlZHVjZXJcdTMwMDJcdTgyRTVcdTU0MENcdTY1RjZcdTU3MjggTW9kdWxlLnJlZHVjZXJzIFx1NEUwRSAkLnJlZHVjZXIgXHU0RTJEXHU1QjlBXHU0RTQ5XHVGRjBDXHU4QkY3XHU0RkREXHU3NTU5IE1vZHVsZS5yZWR1Y2VycyBcdTcyNDhcdTY3MkNcdTYyMTZcdTU0MDhcdTVFNzZcdTRFM0FcdTUzNTVcdTRFMDBcdTVCOUFcdTRFNDlcdTMwMDJcIixcbiAgICAgICAgICBhY3Rpb25UYWc6IGR1cGxpY2F0ZS50YWcsXG4gICAgICAgIH0pXG4gICAgICApXG4gICAgfVxuXG4gICAgaWYgKGxhdGUpIHtcbiAgICAgIGVmZmVjdHMucHVzaChcbiAgICAgICAgRGVidWcucmVjb3JkKHtcbiAgICAgICAgICB0eXBlOiBcImRpYWdub3N0aWNcIixcbiAgICAgICAgICBtb2R1bGVJZDogbGF0ZS5tb2R1bGVJZCA/PyBtb2R1bGVJZEZyb21Db250ZXh0LFxuICAgICAgICAgIGNvZGU6IFwicmVkdWNlcjo6bGF0ZV9yZWdpc3RyYXRpb25cIixcbiAgICAgICAgICBzZXZlcml0eTogXCJlcnJvclwiLFxuICAgICAgICAgIG1lc3NhZ2U6IGBQcmltYXJ5IHJlZHVjZXIgZm9yIHRhZyBcIiR7bGF0ZS50YWd9XCIgd2FzIHJlZ2lzdGVyZWQgYWZ0ZXIgYWN0aW9ucyB3aXRoIHRoaXMgdGFnIGhhZCBhbHJlYWR5IGJlZW4gZGlzcGF0Y2hlZC5gLFxuICAgICAgICAgIGhpbnQ6XG4gICAgICAgICAgICBcIlx1OEJGN1x1NUMwNlx1OEJFNSByZWR1Y2VyIFx1NjNEMFx1NTI0RFx1NTIzMCBNb2R1bGUubWFrZSh7IHJlZHVjZXJzIH0pXHVGRjBDXHU2MjE2XHU3ODZFXHU0RkREXHU1NzI4XHU5OTk2XHU2QjIxIGRpc3BhdGNoIFx1NEU0Qlx1NTI0RFx1NjI2N1x1ODg0QyAkLnJlZHVjZXIoXFxcInRhZ1xcXCIsIC4uLilcdTMwMDJcIixcbiAgICAgICAgICBhY3Rpb25UYWc6IGxhdGUudGFnLFxuICAgICAgICB9KVxuICAgICAgKVxuICAgIH1cblxuICAgIGlmIChlZmZlY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIEVmZmVjdC52b2lkXG4gICAgfVxuXG4gICAgbGV0IGNvbWJpbmVkOiBFZmZlY3QuRWZmZWN0PHZvaWQ+ID0gRWZmZWN0LnZvaWRcbiAgICBmb3IgKGNvbnN0IGVmZiBvZiBlZmZlY3RzKSB7XG4gICAgICBjb21iaW5lZCA9IGNvbWJpbmVkLnBpcGUoRWZmZWN0LnppcFJpZ2h0KGVmZikpXG4gICAgfVxuICAgIHJldHVybiBjb21iaW5lZFxuICB9KS5waXBlKEVmZmVjdC5mbGF0dGVuKVxuIiwgImltcG9ydCB7IEVmZmVjdCB9IGZyb20gXCJlZmZlY3RcIlxuaW1wb3J0ICogYXMgRGVidWcgZnJvbSBcIi4vRGVidWdTaW5rLmpzXCJcbmltcG9ydCB0eXBlIHsgTGlmZWN5Y2xlTWFuYWdlciB9IGZyb20gXCIuL0xpZmVjeWNsZS5qc1wiXG5cbi8qKlxuICogXHU1RjUzIE1vZHVsZSBcdTU3MjggTG9naWMgXHU2MjY3XHU4ODRDXHU2NzFGXHU5NUY0XHU1M0QxXHU3NTFGIGxpZmVjeWNsZSBcdTk1MTlcdThCRUZcdTMwMDFcdTRFMTRcdTY3MkFcdTZDRThcdTUxOENcdTRFRkJcdTRGNTUgb25FcnJvciBcdTU5MDRcdTc0MDZcdTU2NjhcdTY1RjZcdUZGMENcbiAqIFx1NTNEMVx1NTFGQVx1NEUwMFx1Njc2MSB3YXJuaW5nIFx1N0VBN1x1NTIyQlx1NzY4NFx1OEJDQVx1NjVBRFx1NEU4Qlx1NEVGNlx1RkYwQ1x1NjNEMFx1OTE5Mlx1NzUyOFx1NjIzN1x1NTcyOCBMb2dpYyBcdTVGMDBcdTU5MzRcdTg4NjVcdTUxNDUgJC5saWZlY3ljbGUub25FcnJvclx1MzAwMlxuICovXG5leHBvcnQgY29uc3QgZW1pdE1pc3NpbmdPbkVycm9yRGlhZ25vc3RpY0lmTmVlZGVkID0gKFxuICBsaWZlY3ljbGU6IExpZmVjeWNsZU1hbmFnZXIsXG4gIG1vZHVsZUlkPzogc3RyaW5nXG4pOiBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+ID0+XG4gIGxpZmVjeWNsZS5oYXNPbkVycm9ySGFuZGxlcnMucGlwZShcbiAgICBFZmZlY3QuZmxhdE1hcCgoaGFzKSA9PlxuICAgICAgaGFzIHx8ICFtb2R1bGVJZFxuICAgICAgICA/IEVmZmVjdC52b2lkXG4gICAgICAgIDogRGVidWcucmVjb3JkKHtcbiAgICAgICAgICAgIHR5cGU6IFwiZGlhZ25vc3RpY1wiLFxuICAgICAgICAgICAgbW9kdWxlSWQsXG4gICAgICAgICAgICBjb2RlOiBcImxpZmVjeWNsZTo6bWlzc2luZ19vbl9lcnJvclwiLFxuICAgICAgICAgICAgc2V2ZXJpdHk6IFwid2FybmluZ1wiLFxuICAgICAgICAgICAgbWVzc2FnZTogYE1vZHVsZSBcIiR7bW9kdWxlSWR9XCIgcmVjZWl2ZWQgYSBsaWZlY3ljbGUgZXJyb3IgYnV0IGhhcyBubyAkLmxpZmVjeWNsZS5vbkVycm9yIGhhbmRsZXIgcmVnaXN0ZXJlZC5gLFxuICAgICAgICAgICAgaGludDpcbiAgICAgICAgICAgICAgXCJcdTVFRkFcdThCQUVcdTU3MjhcdThCRTUgTW9kdWxlIFx1NzY4NCBMb2dpYyBcdTVGMDBcdTU5MzRcdTZERkJcdTUyQTAgJC5saWZlY3ljbGUub25FcnJvcigoY2F1c2UsIGNvbnRleHQpID0+IC4uLikgXHU0RUU1XHU3RURGXHU0RTAwXHU1MTVDXHU1RTk1XHU5MDNCXHU4RjkxXHU5NTE5XHU4QkVGXHUzMDAyXCIsXG4gICAgICAgICAgfSlcbiAgICApXG4gIClcbiIsICJpbXBvcnQgeyBDYXVzZSwgQ29udGV4dCwgRWZmZWN0IH0gZnJvbSBcImVmZmVjdFwiXG5pbXBvcnQgKiBhcyBEZWJ1ZyBmcm9tIFwiLi9EZWJ1Z1NpbmsuanNcIlxuaW1wb3J0IHsgaXNEZXZFbnYgfSBmcm9tIFwiLi9lbnYuanNcIlxuXG5jb25zdCBwaGFzZURpYWdub3N0aWNzRW5hYmxlZCA9ICgpOiBib29sZWFuID0+IGlzRGV2RW52KClcblxuLyoqXG4gKiBMb2dpYyBcdTc2RjhcdTUxNzNcdThCQ0FcdTY1QURcdUZGMUFcbiAqIC0gXHU1RjUzXHU1MjREXHU4MDVBXHU3MTI2XHU0RThFIEVudiBTZXJ2aWNlIFx1N0YzQVx1NTkzMVx1NUJGQ1x1ODFGNFx1NzY4NFx1NTIxRFx1NTlDQlx1NTMxNlx1NTY2QVx1OTdGM1x1RkYwOFNlcnZpY2Ugbm90IGZvdW5kXHVGRjA5XHUzMDAyXG4gKlxuICogXHU4QkJFXHU4QkExXHU2MTBGXHU1NkZFXHVGRjFBXG4gKiAtIFx1NTcyOFx1NjNBOFx1ODM1MFx1NzUyOFx1NkNENVx1NEUwQlx1RkYwQ1J1bnRpbWUgLyBSZWFjdCBcdTVDNDJcdTRGMUFcdTZCNjNcdTc4NkVcdTYzRDBcdTRGOUIgRW52XHVGRjFCXG4gKiAtIFx1NEY0Nlx1NTcyOFx1NjdEMFx1NEU5Qlx1NTIxRFx1NTlDQlx1NTMxNlx1NjVGNlx1NUU4Rlx1NEUwQlx1RkYwQ0xvZ2ljIFx1NTNFRlx1ODBGRFx1NTcyOCBFbnYgXHU5NEZBXHU2RUUxXHU1MjREXHU1QzMxXHU1QzFEXHU4QkQ1XHU4QkZCXHU1M0Q2IFNlcnZpY2VcdUZGMUJcbiAqIC0gXHU4RkQ5XHU3QzdCXHU5NTE5XHU4QkVGXHU5MDFBXHU1RTM4XHU1M0VBXHU1MUZBXHU3M0IwXHU0RTAwXHU2QjIxXHVGRjBDXHU0RTBEXHU2NTM5XHU1M0Q4XHU2NzAwXHU3RUM4XHU4QkVEXHU0RTQ5XHVGRjBDXHU1Mzc0XHU0RjFBXHU2QzYxXHU2N0QzXHU2NUU1XHU1RkQ3XHUzMDAyXG4gKlxuICogXHU1NkUwXHU2QjY0XHU4RkQ5XHU5MUNDXHU1NzI4IERlYnVnIFx1NEZBN1x1NTNEMVx1NTFGQVx1NEUwMFx1Njc2MSB3YXJuaW5nIFx1N0VBNyBkaWFnbm9zdGljXHVGRjBDXHU4OUUzXHU5MUNBXHU1M0VGXHU4MEZEXHU1MzlGXHU1NkUwXHU0RTBFXHU2MzkyXHU2N0U1XHU4REVGXHU1Rjg0XHVGRjBDXG4gKiBcdTc3MUZcdTZCNjNcdTc2ODRcdTk1MTlcdThCRUZcdThCRURcdTRFNDlcdTRFQ0RcdTc1MzEgbGlmZWN5Y2xlLm9uRXJyb3IgLyBBcHBSdW50aW1lLm9uRXJyb3IgXHU1OTA0XHU3NDA2XHUzMDAyXG4gKi9cblxuY29uc3QgU0VSVklDRV9OT1RfRk9VTkRfUFJFRklYID0gXCJTZXJ2aWNlIG5vdCBmb3VuZDpcIlxuXG4vKipcbiAqIFx1ODJFNSBDYXVzZSBcdTRFMkRcdTUzMDVcdTU0MkIgYFNlcnZpY2Ugbm90IGZvdW5kOiAuLi5gIFx1OTUxOVx1OEJFRlx1RkYwQ1x1NTIxOVx1NTNEMVx1NTFGQVx1NEUwMFx1Njc2MSB3YXJuaW5nIFx1N0VBNyBkaWFnbm9zdGljXHVGRjFBXG4gKiAtIGNvZGU6IGxvZ2ljOjplbnZfc2VydmljZV9ub3RfZm91bmRcbiAqIC0gbWVzc2FnZTogXHU1MzlGXHU1OUNCXHU5NTE5XHU4QkVGIG1lc3NhZ2VcdUZGMUJcbiAqIC0gaGludDogXHU4QkY0XHU2NjBFXHU4RkQ5XHU2NjJGXHU1REYyXHU3N0U1XHU3Njg0XHU1MjFEXHU1OUNCXHU1MzE2XHU2NUY2XHU1RThGXHU1NjZBXHU5N0YzXHVGRjBDXHU1RTc2XHU3RUQ5XHU1MUZBXHU2MzkyXHU2N0U1XHU1RUZBXHU4QkFFXHUzMDAyXG4gKi9cbmV4cG9ydCBjb25zdCBlbWl0RW52U2VydmljZU5vdEZvdW5kRGlhZ25vc3RpY0lmTmVlZGVkID0gKFxuICBjYXVzZTogQ2F1c2UuQ2F1c2U8dW5rbm93bj4sXG4gIG1vZHVsZUlkPzogc3RyaW5nXG4pOiBFZmZlY3QuRWZmZWN0PHZvaWQ+ID0+XG4gIEVmZmVjdC5nZW4oZnVuY3Rpb24qICgpIHtcbiAgICBsZXQgcHJldHR5OiBzdHJpbmdcbiAgICB0cnkge1xuICAgICAgcHJldHR5ID0gQ2F1c2UucHJldHR5KGNhdXNlLCB7IHJlbmRlckVycm9yQ2F1c2U6IHRydWUgfSlcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICghcHJldHR5LmluY2x1ZGVzKFNFUlZJQ0VfTk9UX0ZPVU5EX1BSRUZJWCkpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIDEpIEVudiBTZXJ2aWNlIFx1N0YzQVx1NTkzMVx1NjcyQ1x1OEVBQlx1NzY4NCB3YXJuaW5nIFx1OEJDQVx1NjVBRFxuICAgIHlpZWxkKiBEZWJ1Zy5yZWNvcmQoe1xuICAgICAgdHlwZTogXCJkaWFnbm9zdGljXCIsXG4gICAgICBtb2R1bGVJZCxcbiAgICAgIGNvZGU6IFwibG9naWM6OmVudl9zZXJ2aWNlX25vdF9mb3VuZFwiLFxuICAgICAgc2V2ZXJpdHk6IFwid2FybmluZ1wiLFxuICAgICAgbWVzc2FnZTogcHJldHR5LFxuICAgICAgaGludDpcbiAgICAgICAgXCJMb2dpYyBcdTU3MjhcdTUyMURcdTU5Q0JcdTUzMTZcdTk2MzZcdTZCQjVcdTVDMURcdThCRDVcdThCQkZcdTk1RUVcdTVDMUFcdTY3MkFcdTYzRDBcdTRGOUJcdTc2ODQgRW52IFNlcnZpY2VcdUZGMENcdTkwMUFcdTVFMzhcdTY2MkYgUnVudGltZSAvIFJlYWN0IFx1OTZDNlx1NjIxMFx1NEUyRFx1NzY4NFx1NURGMlx1NzdFNVx1NTIxRFx1NTlDQlx1NTMxNlx1NTY2QVx1OTdGM1x1MzAwMlwiICtcbiAgICAgICAgXCJcdTgyRTVcdTUzRUFcdTU3MjhcdTVFOTRcdTc1MjhcdTU0MkZcdTUyQThcdTY1RTlcdTY3MUZcdTUxRkFcdTczQjBcdTRFMDBcdTZCMjFcdTRFMTRcdTU0MEVcdTdFRURcdTcyQjZcdTYwMDFcdTRFMEUgRW52IFx1NTc0N1x1NkI2M1x1NUUzOFx1RkYwQ1x1NTNFRlx1NjY4Mlx1ODlDNlx1NEUzQVx1NjVFMFx1NUJCM1x1RkYxQlwiICtcbiAgICAgICAgXCJcdTgyRTVcdTYzMDFcdTdFRURcdTUxRkFcdTczQjBcdTYyMTZcdTRGMzRcdTk2OEZcdTRFMUFcdTUyQTFcdTVGMDJcdTVFMzhcdUZGMENcdThCRjdcdTY4QzBcdTY3RTUgUnVudGltZS5tYWtlIC8gUnVudGltZVByb3ZpZGVyLmxheWVyIFx1NjYyRlx1NTQyNlx1NkI2M1x1Nzg2RVx1NjNEMFx1NEY5Qlx1NEU4Nlx1NUJGOVx1NUU5NCBTZXJ2aWNlXHUzMDAyXCIsXG4gICAgfSlcblxuICAgIC8vIDIpIFx1NTcyOFx1NjdEMFx1NEU5Qlx1NTczQVx1NjY2Rlx1NEUwQlx1RkYwOFx1NEY4Qlx1NTk4MiBMb2dpYyBzZXR1cCBcdTZCQjVcdThGQzdcdTY1RTlcdThCQkZcdTk1RUUgRW52XHVGRjA5XHVGRjBDXHU2MjExXHU0RUVDXHU0RTVGXHU1RTBDXHU2NzFCXHU5MDFBXHU4RkM3XG4gICAgLy8gICAgbG9naWM6OmludmFsaWRfcGhhc2UgXHU2M0QwXHU5MTkyXHUyMDFDXHU4QkY3XHU1QzA2IEVudiBcdThCQkZcdTk1RUVcdTc5RkJcdTUyQThcdTUyMzAgcnVuIFx1NkJCNVx1MjAxRFx1MzAwMlxuICAgIC8vXG4gICAgLy8gXHU3NTMxXHU0RThFXHU1RjUzXHU1MjREXHU1QjlFXHU3M0IwXHU2NUUwXHU2Q0Q1XHU1NzI4XHU2QjY0XHU1OTA0XHU1M0VGXHU5NzYwXHU1MjI0XHU2NUFEXHU4QzAzXHU3NTI4XHU1M0QxXHU3NTFGXHU3Njg0IHBoYXNlXHVGRjBDXHU4RkQ5XHU5MUNDXHU1M0VBXHU2NjJGXHU2M0QwXHU0RjlCXHU0RTAwXHU0RTJBXHU4ODY1XHU1MTQ1XHU2MDI3XHU3Njg0XG4gICAgLy8gXHU4QkNBXHU2NUFEXHU0RkUxXHU1M0Y3XHVGRjBDXHU3NzFGXHU2QjYzXHU3Njg0IHBoYXNlIFx1NUI4OFx1NTM2Qlx1NEVDRFx1NzUzMSBMb2dpY1BoYXNlRXJyb3IgKyBlbWl0SW52YWxpZFBoYXNlRGlhZ25vc3RpY0lmTmVlZGVkIFx1NjI3Rlx1NjJDNVx1MzAwMlxuICAgIHlpZWxkKiBEZWJ1Zy5yZWNvcmQoe1xuICAgICAgdHlwZTogXCJkaWFnbm9zdGljXCIsXG4gICAgICBtb2R1bGVJZCxcbiAgICAgIGNvZGU6IFwibG9naWM6OmludmFsaWRfcGhhc2VcIixcbiAgICAgIHNldmVyaXR5OiBcImVycm9yXCIsXG4gICAgICBtZXNzYWdlOiBcIiQudXNlIGlzIG5vdCBhbGxvd2VkIGJlZm9yZSBFbnYgaXMgZnVsbHkgcmVhZHkuXCIsXG4gICAgICBoaW50OlxuICAgICAgICBcInNldHVwIFx1NkJCNVx1NjIxNiBFbnYgXHU2NzJBXHU1QjhDXHU1MTY4XHU1QzMxXHU3RUVBXHU2NUY2XHU4QkY3XHU5MDdGXHU1MTREXHU3NkY0XHU2M0E1XHU4QkZCXHU1M0Q2IFNlcnZpY2VcdUZGMUJcIiArXG4gICAgICAgIFwiXHU1RUZBXHU4QkFFXHU1QzA2XHU1QkY5IEVudiBcdTc2ODRcdThCQkZcdTk1RUVcdTc5RkJcdTUyQThcdTUyMzAgTG9naWMgXHU3Njg0IHJ1biBcdTZCQjVcdUZGMENcdTYyMTZcdTkwMUFcdThGQzcgJC5saWZlY3ljbGUub25Jbml0IFx1NTMwNVx1ODhDNVx1NTIxRFx1NTlDQlx1NTMxNlx1NkQ0MVx1N0EwQlx1MzAwMlwiLFxuICAgICAga2luZDogXCJlbnZfc2VydmljZV9ub3RfcmVhZHlcIixcbiAgICB9KVxuICB9KVxuXG5leHBvcnQgaW50ZXJmYWNlIExvZ2ljUGhhc2VFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcmVhZG9ubHkgX3RhZzogXCJMb2dpY1BoYXNlRXJyb3JcIlxuICByZWFkb25seSBraW5kOiBzdHJpbmdcbiAgcmVhZG9ubHkgYXBpPzogc3RyaW5nXG4gIHJlYWRvbmx5IHBoYXNlOiBcInNldHVwXCIgfCBcInJ1blwiXG4gIHJlYWRvbmx5IG1vZHVsZUlkPzogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9naWNQaGFzZVNlcnZpY2Uge1xuICByZWFkb25seSBjdXJyZW50OiBcInNldHVwXCIgfCBcInJ1blwiXG59XG5cbmV4cG9ydCBjb25zdCBMb2dpY1BoYXNlU2VydmljZVRhZyA9IENvbnRleHQuR2VuZXJpY1RhZzxMb2dpY1BoYXNlU2VydmljZT4oXG4gIFwiQGxvZ2l4L0xvZ2ljUGhhc2VTZXJ2aWNlXCJcbilcblxuZXhwb3J0IGNvbnN0IG1ha2VMb2dpY1BoYXNlRXJyb3IgPSAoXG4gIGtpbmQ6IHN0cmluZyxcbiAgYXBpOiBzdHJpbmcsXG4gIHBoYXNlOiBcInNldHVwXCIgfCBcInJ1blwiLFxuICBtb2R1bGVJZD86IHN0cmluZ1xuKTogTG9naWNQaGFzZUVycm9yID0+XG4gIE9iamVjdC5hc3NpZ24oXG4gICAgbmV3IEVycm9yKFxuICAgICAgYFtMb2dpY1BoYXNlRXJyb3JdICR7YXBpfSBpcyBub3QgYWxsb3dlZCBpbiAke3BoYXNlfSBwaGFzZSAoa2luZD0ke2tpbmR9KS5gXG4gICAgKSxcbiAgICB7XG4gICAgICBfdGFnOiBcIkxvZ2ljUGhhc2VFcnJvclwiLFxuICAgICAga2luZCxcbiAgICAgIGFwaSxcbiAgICAgIHBoYXNlLFxuICAgICAgbW9kdWxlSWQsXG4gICAgfVxuICApIGFzIExvZ2ljUGhhc2VFcnJvclxuXG4vKipcbiAqIFx1NEVDRSBDYXVzZSBcdTRFMkRcdTYzRDBcdTUzRDYgTG9naWNQaGFzZUVycm9yXHVGRjBDXHU1RTc2XHU0RUU1IGRpYWdub3N0aWMgXHU1RjYyXHU1RjBGXHU1M0QxXHU1MUZBXHVGRjFBXG4gKiAtIGNvZGU6IGxvZ2ljOjppbnZhbGlkX3BoYXNlXG4gKiAtIGtpbmQ6IFx1NTE3N1x1NEY1M1x1OEZERFx1ODlDNFx1N0M3Qlx1NTc4Qlx1RkYwOFx1NTk4MiB1c2VfaW5fc2V0dXBcdUZGMDlcbiAqL1xuZXhwb3J0IGNvbnN0IGVtaXRJbnZhbGlkUGhhc2VEaWFnbm9zdGljSWZOZWVkZWQgPSAoXG4gIGNhdXNlOiBDYXVzZS5DYXVzZTx1bmtub3duPixcbiAgbW9kdWxlSWQ/OiBzdHJpbmdcbik6IEVmZmVjdC5FZmZlY3Q8dm9pZD4gPT5cbiAgRWZmZWN0LmdlbihmdW5jdGlvbiogKCkge1xuICAgIGlmICghcGhhc2VEaWFnbm9zdGljc0VuYWJsZWQoKSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3QgYWxsRXJyb3JzID0gW1xuICAgICAgLi4uQ2F1c2UuZmFpbHVyZXMoY2F1c2UpLFxuICAgICAgLi4uQ2F1c2UuZGVmZWN0cyhjYXVzZSksXG4gICAgXVxuXG4gICAgZm9yIChjb25zdCBlcnIgb2YgYWxsRXJyb3JzKSB7XG4gICAgICBjb25zdCBsb2dpY0VyciA9IGVyciBhcyBhbnlcbiAgICAgIGlmIChsb2dpY0VyciAmJiBsb2dpY0Vyci5fdGFnID09PSBcIkxvZ2ljUGhhc2VFcnJvclwiKSB7XG4gICAgICAgIGNvbnN0IHBoYXNlRXJyID0gbG9naWNFcnIgYXMgTG9naWNQaGFzZUVycm9yXG4gICAgICAgIGNvbnN0IGhpbnQgPVxuICAgICAgICAgIHBoYXNlRXJyLmtpbmQgPT09IFwidXNlX2luX3NldHVwXCIgfHxcbiAgICAgICAgICBwaGFzZUVyci5raW5kID09PSBcImxpZmVjeWNsZV9pbl9zZXR1cFwiXG4gICAgICAgICAgICA/IFwic2V0dXAgXHU2QkI1XHU3OTgxXHU2QjYyXHU4QkZCXHU1M0Q2IEVudi9TZXJ2aWNlIFx1NjIxNlx1NjI2N1x1ODg0Q1x1OTU3Rlx1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1OTAzQlx1OEY5MVx1RkYwQ1x1OEJGN1x1NUMwNlx1NzZGOFx1NTE3M1x1OEMwM1x1NzUyOFx1NzlGQlx1NTJBOFx1NTIzMCBydW4gXHU2QkI1XHUzMDAyXCJcbiAgICAgICAgICAgIDogXCJcdThDMDNcdTY1NzRcdTkwM0JcdThGOTFcdTUyMzAgcnVuIFx1NkJCNVx1RkYwQ3NldHVwIFx1NEVDNVx1NTA1QVx1NkNFOFx1NTE4Q1x1N0M3Qlx1NjRDRFx1NEY1Q1x1MzAwMlwiXG5cbiAgICAgICAgeWllbGQqIERlYnVnLnJlY29yZCh7XG4gICAgICAgICAgdHlwZTogXCJkaWFnbm9zdGljXCIsXG4gICAgICAgICAgbW9kdWxlSWQ6IHBoYXNlRXJyLm1vZHVsZUlkID8/IG1vZHVsZUlkLFxuICAgICAgICAgIGNvZGU6IFwibG9naWM6OmludmFsaWRfcGhhc2VcIixcbiAgICAgICAgICBzZXZlcml0eTogXCJlcnJvclwiLFxuICAgICAgICAgIG1lc3NhZ2U6IGAke3BoYXNlRXJyLmFwaSA/PyBwaGFzZUVyci5raW5kfSBpcyBub3QgYWxsb3dlZCBpbiAke3BoYXNlRXJyLnBoYXNlfSBwaGFzZS5gLFxuICAgICAgICAgIGhpbnQsXG4gICAgICAgICAga2luZDogcGhhc2VFcnIua2luZCxcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBcdTU0N0RcdTRFMkRcdTk5OTZcdTRFMkEgTG9naWNQaGFzZUVycm9yIFx1NTM3M1x1NTNFRlx1OEZENFx1NTZERVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICB9XG4gIH0pXG4iLCAiLy8gXHU3RURGXHU0RTAwXHU3Njg0XHU4RkQwXHU4ODRDXHU2NUY2XHU3M0FGXHU1ODgzXHU2OEMwXHU2RDRCXHVGRjBDXHU5MDdGXHU1MTREIGJ1bmRsZXIgXHU1NzI4XHU2Nzg0XHU1RUZBXHU2NzFGXHU1MTg1XHU4MDU0IE5PREVfRU5WXHUzMDAyXG5leHBvcnQgY29uc3QgZ2V0Tm9kZUVudiA9ICgpOiBzdHJpbmcgfCB1bmRlZmluZWQgPT4ge1xuICB0cnkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgZW52ID0gKGdsb2JhbFRoaXMgYXMgYW55KT8ucHJvY2Vzcz8uZW52XG4gICAgcmV0dXJuIHR5cGVvZiBlbnY/Lk5PREVfRU5WID09PSBcInN0cmluZ1wiID8gZW52Lk5PREVfRU5WIDogdW5kZWZpbmVkXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgaXNEZXZFbnYgPSAoKTogYm9vbGVhbiA9PiBnZXROb2RlRW52KCkgIT09IFwicHJvZHVjdGlvblwiXG4iLCAiaW1wb3J0IHsgQ29udGV4dCwgRWZmZWN0LCBPcHRpb24sIFNjaGVtYSwgU3RyZWFtLCBTdWJzY3JpcHRpb25SZWYgfSBmcm9tIFwiZWZmZWN0XCJcbmltcG9ydCB7IGNyZWF0ZSB9IGZyb20gXCJtdXRhdGl2ZVwiXG5pbXBvcnQgdHlwZSAqIGFzIExvZ2l4IGZyb20gXCIuL2NvcmUvbW9kdWxlLmpzXCJcbmltcG9ydCAqIGFzIExvZ2ljIGZyb20gXCIuL2NvcmUvTG9naWNNaWRkbGV3YXJlLmpzXCJcbmltcG9ydCAqIGFzIEZsb3dSdW50aW1lIGZyb20gXCIuL0Zsb3dSdW50aW1lLmpzXCJcbmltcG9ydCAqIGFzIE1hdGNoQnVpbGRlciBmcm9tIFwiLi9jb3JlL01hdGNoQnVpbGRlci5qc1wiXG5pbXBvcnQgKiBhcyBQbGF0Zm9ybSBmcm9tIFwiLi9jb3JlL1BsYXRmb3JtLmpzXCJcbmltcG9ydCAqIGFzIExpZmVjeWNsZSBmcm9tIFwiLi9MaWZlY3ljbGUuanNcIlxuaW1wb3J0ICogYXMgTG9naWNEaWFnbm9zdGljcyBmcm9tIFwiLi9jb3JlL0xvZ2ljRGlhZ25vc3RpY3MuanNcIlxuaW1wb3J0IHR5cGUge1xuICBBbnlNb2R1bGVTaGFwZSxcbiAgTW9kdWxlUnVudGltZSxcbiAgU3RhdGVPZixcbiAgQWN0aW9uT2YsXG59IGZyb20gXCIuL2NvcmUvbW9kdWxlLmpzXCJcblxuZXhwb3J0IGNvbnN0IGdsb2JhbExvZ2ljUGhhc2VSZWY6IHsgY3VycmVudDogXCJzZXR1cFwiIHwgXCJydW5cIiB9ID0ge1xuICBjdXJyZW50OiBcInJ1blwiLFxufVxuXG4vLyBcdTY3MkNcdTU3MzBcdTY3ODRcdTkwMjAgSW50ZW50QnVpbGRlciBcdTVERTVcdTUzODJcdUZGMENcdTdCNDlcdTRFRjdcdTRFOEVcdTUzOUYgaW50ZXJuYWwvZHNsL0xvZ2ljQnVpbGRlci5tYWtlSW50ZW50QnVpbGRlckZhY3RvcnlcbmNvbnN0IExvZ2ljQnVpbGRlckZhY3RvcnkgPSA8U2ggZXh0ZW5kcyBBbnlNb2R1bGVTaGFwZSwgUiA9IG5ldmVyPihcbiAgcnVudGltZTogTW9kdWxlUnVudGltZTxTdGF0ZU9mPFNoPiwgQWN0aW9uT2Y8U2g+PlxuKSA9PiB7XG4gIGNvbnN0IGZsb3dBcGkgPSBGbG93UnVudGltZS5tYWtlPFNoLCBSPihydW50aW1lKVxuXG4gIHJldHVybiA8VD4oc3RyZWFtOiBTdHJlYW0uU3RyZWFtPFQ+KTogTG9naWMuSW50ZW50QnVpbGRlcjxULCBTaCwgUj4gPT4ge1xuICAgIGNvbnN0IGJ1aWxkZXIgPSB7XG4gICAgICBkZWJvdW5jZTogKG1zOiBudW1iZXIpID0+XG4gICAgICAgIExvZ2ljQnVpbGRlckZhY3Rvcnk8U2gsIFI+KHJ1bnRpbWUpKFxuICAgICAgICAgIGZsb3dBcGkuZGVib3VuY2U8VD4obXMpKHN0cmVhbSlcbiAgICAgICAgKSxcbiAgICAgIHRocm90dGxlOiAobXM6IG51bWJlcikgPT5cbiAgICAgICAgTG9naWNCdWlsZGVyRmFjdG9yeTxTaCwgUj4ocnVudGltZSkoXG4gICAgICAgICAgZmxvd0FwaS50aHJvdHRsZTxUPihtcykoc3RyZWFtKVxuICAgICAgICApLFxuICAgICAgZmlsdGVyOiAocHJlZGljYXRlOiAodmFsdWU6IFQpID0+IGJvb2xlYW4pID0+XG4gICAgICAgIExvZ2ljQnVpbGRlckZhY3Rvcnk8U2gsIFI+KHJ1bnRpbWUpKFxuICAgICAgICAgIGZsb3dBcGkuZmlsdGVyKHByZWRpY2F0ZSkoc3RyZWFtKVxuICAgICAgICApLFxuICAgICAgbWFwOiA8VT4oZjogKHZhbHVlOiBUKSA9PiBVKSA9PlxuICAgICAgICBMb2dpY0J1aWxkZXJGYWN0b3J5PFNoLCBSPihydW50aW1lKShcbiAgICAgICAgICBzdHJlYW0ucGlwZShTdHJlYW0ubWFwKGYpKVxuICAgICAgICApLFxuICAgICAgcnVuOiA8QSA9IHZvaWQsIEUgPSBuZXZlciwgUjIgPSB1bmtub3duPihcbiAgICAgICAgZWZmOlxuICAgICAgICAgIHwgTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT5cbiAgICAgICAgICB8ICgocDogVCkgPT4gTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT4pXG4gICAgICApOiBMb2dpYy5PZjxTaCwgUiAmIFIyLCB2b2lkLCBFPiA9PlxuICAgICAgICBMb2dpYy5zZWN1cmUoXG4gICAgICAgICAgZmxvd0FwaS5ydW48VCwgQSwgRSwgUjI+KGVmZikoc3RyZWFtKSxcbiAgICAgICAgICB7IG5hbWU6IFwiZmxvdy5ydW5cIiB9XG4gICAgICAgICksXG4gICAgICBydW5MYXRlc3Q6IDxBID0gdm9pZCwgRSA9IG5ldmVyLCBSMiA9IHVua25vd24+KFxuICAgICAgICBlZmY6XG4gICAgICAgICAgfCBMb2dpYy5PZjxTaCwgUiAmIFIyLCBBLCBFPlxuICAgICAgICAgIHwgKChwOiBUKSA9PiBMb2dpYy5PZjxTaCwgUiAmIFIyLCBBLCBFPilcbiAgICAgICk6IExvZ2ljLk9mPFNoLCBSICYgUjIsIHZvaWQsIEU+ID0+XG4gICAgICAgIExvZ2ljLnNlY3VyZShcbiAgICAgICAgICBmbG93QXBpLnJ1bkxhdGVzdDxULCBBLCBFLCBSMj4oZWZmKShzdHJlYW0pLFxuICAgICAgICAgIHsgbmFtZTogXCJmbG93LnJ1bkxhdGVzdFwiIH1cbiAgICAgICAgKSxcbiAgICAgIHJ1bkV4aGF1c3Q6IDxBID0gdm9pZCwgRSA9IG5ldmVyLCBSMiA9IHVua25vd24+KFxuICAgICAgICBlZmY6XG4gICAgICAgICAgfCBMb2dpYy5PZjxTaCwgUiAmIFIyLCBBLCBFPlxuICAgICAgICAgIHwgKChwOiBUKSA9PiBMb2dpYy5PZjxTaCwgUiAmIFIyLCBBLCBFPilcbiAgICAgICk6IExvZ2ljLk9mPFNoLCBSICYgUjIsIHZvaWQsIEU+ID0+XG4gICAgICAgIExvZ2ljLnNlY3VyZShcbiAgICAgICAgICBmbG93QXBpLnJ1bkV4aGF1c3Q8VCwgQSwgRSwgUjI+KGVmZikoc3RyZWFtKSxcbiAgICAgICAgICB7IG5hbWU6IFwiZmxvdy5ydW5FeGhhdXN0XCIgfVxuICAgICAgICApLFxuICAgICAgcnVuUGFyYWxsZWw6IDxBID0gdm9pZCwgRSA9IG5ldmVyLCBSMiA9IHVua25vd24+KFxuICAgICAgICBlZmY6XG4gICAgICAgICAgfCBMb2dpYy5PZjxTaCwgUiAmIFIyLCBBLCBFPlxuICAgICAgICAgIHwgKChwOiBUKSA9PiBMb2dpYy5PZjxTaCwgUiAmIFIyLCBBLCBFPilcbiAgICAgICk6IExvZ2ljLk9mPFNoLCBSICYgUjIsIHZvaWQsIEU+ID0+XG4gICAgICAgIExvZ2ljLnNlY3VyZShcbiAgICAgICAgICBmbG93QXBpLnJ1blBhcmFsbGVsPFQsIEEsIEUsIFIyPihlZmYpKHN0cmVhbSksXG4gICAgICAgICAgeyBuYW1lOiBcImZsb3cucnVuUGFyYWxsZWxcIiB9XG4gICAgICAgICksXG4gICAgICBydW5Gb3JrOiA8QSA9IHZvaWQsIEUgPSBuZXZlciwgUjIgPSB1bmtub3duPihcbiAgICAgICAgZWZmOlxuICAgICAgICAgIHwgTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT5cbiAgICAgICAgICB8ICgocDogVCkgPT4gTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT4pXG4gICAgICApOiBMb2dpYy5PZjxTaCwgUiAmIFIyLCB2b2lkLCBFPiA9PlxuICAgICAgICBMb2dpYy5zZWN1cmUoXG4gICAgICAgICAgRWZmZWN0LmZvcmtTY29wZWQoZmxvd0FwaS5ydW48VCwgQSwgRSwgUjI+KGVmZikoc3RyZWFtKSksXG4gICAgICAgICAgeyBuYW1lOiBcImZsb3cucnVuRm9ya1wiIH1cbiAgICAgICAgKSBhcyBMb2dpYy5PZjxTaCwgUiAmIFIyLCB2b2lkLCBFPixcbiAgICAgIHJ1blBhcmFsbGVsRm9yazogPEEgPSB2b2lkLCBFID0gbmV2ZXIsIFIyID0gdW5rbm93bj4oXG4gICAgICAgIGVmZjpcbiAgICAgICAgICB8IExvZ2ljLk9mPFNoLCBSICYgUjIsIEEsIEU+XG4gICAgICAgICAgfCAoKHA6IFQpID0+IExvZ2ljLk9mPFNoLCBSICYgUjIsIEEsIEU+KVxuICAgICAgKTogTG9naWMuT2Y8U2gsIFIgJiBSMiwgdm9pZCwgRT4gPT5cbiAgICAgICAgTG9naWMuc2VjdXJlKFxuICAgICAgICAgIEVmZmVjdC5mb3JrU2NvcGVkKFxuICAgICAgICAgICAgZmxvd0FwaS5ydW5QYXJhbGxlbDxULCBBLCBFLCBSMj4oZWZmKShzdHJlYW0pLFxuICAgICAgICAgICksXG4gICAgICAgICAgeyBuYW1lOiBcImZsb3cucnVuUGFyYWxsZWxGb3JrXCIgfVxuICAgICAgICApIGFzIExvZ2ljLk9mPFNoLCBSICYgUjIsIHZvaWQsIEU+LFxuICAgICAgdG9TdHJlYW06ICgpID0+IHN0cmVhbSxcbiAgICAgIHVwZGF0ZTogKFxuICAgICAgICByZWR1Y2VyOiAoXG4gICAgICAgICAgcHJldjogU3RhdGVPZjxTaD4sXG4gICAgICAgICAgcGF5bG9hZDogVFxuICAgICAgICApID0+XG4gICAgICAgICAgfCBTdGF0ZU9mPFNoPlxuICAgICAgICAgIHwgRWZmZWN0LkVmZmVjdDxTdGF0ZU9mPFNoPiwgYW55LCBhbnk+XG4gICAgICApOiBMb2dpYy5PZjxTaCwgUiwgdm9pZCwgbmV2ZXI+ID0+XG4gICAgICAgIFN0cmVhbS5ydW5Gb3JFYWNoKHN0cmVhbSwgKHBheWxvYWQpID0+XG4gICAgICAgICAgRWZmZWN0LmZsYXRNYXAocnVudGltZS5nZXRTdGF0ZSwgKHByZXYpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHQgPSByZWR1Y2VyKHByZXYsIHBheWxvYWQpXG4gICAgICAgICAgICByZXR1cm4gRWZmZWN0LmlzRWZmZWN0KG5leHQpXG4gICAgICAgICAgICAgID8gRWZmZWN0LmZsYXRNYXAoXG4gICAgICAgICAgICAgICAgbmV4dCBhcyBFZmZlY3QuRWZmZWN0PFN0YXRlT2Y8U2g+LCBhbnksIGFueT4sXG4gICAgICAgICAgICAgICAgcnVudGltZS5zZXRTdGF0ZVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIDogcnVudGltZS5zZXRTdGF0ZShuZXh0KVxuICAgICAgICAgIH0pXG4gICAgICAgICkucGlwZShcbiAgICAgICAgICBFZmZlY3QuY2F0Y2hBbGxDYXVzZSgoY2F1c2UpID0+XG4gICAgICAgICAgICBFZmZlY3QubG9nRXJyb3IoXCJGbG93IGVycm9yXCIsIGNhdXNlKVxuICAgICAgICAgIClcbiAgICAgICAgKSBhcyBMb2dpYy5PZjxTaCwgUiwgdm9pZCwgbmV2ZXI+LFxuICAgICAgbXV0YXRlOiAoXG4gICAgICAgIHJlZHVjZXI6IChkcmFmdDogTG9naWMuRHJhZnQ8U3RhdGVPZjxTaD4+LCBwYXlsb2FkOiBUKSA9PiB2b2lkXG4gICAgICApOiBMb2dpYy5PZjxTaCwgUiwgdm9pZCwgbmV2ZXI+ID0+XG4gICAgICAgIFN0cmVhbS5ydW5Gb3JFYWNoKHN0cmVhbSwgKHBheWxvYWQpID0+XG4gICAgICAgICAgRWZmZWN0LmZsYXRNYXAocnVudGltZS5nZXRTdGF0ZSwgKHByZXYpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHQgPSBjcmVhdGUocHJldiBhcyBTdGF0ZU9mPFNoPiwgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICAgIHJlZHVjZXIoZHJhZnQgYXMgTG9naWMuRHJhZnQ8U3RhdGVPZjxTaD4+LCBwYXlsb2FkKVxuICAgICAgICAgICAgfSkgYXMgU3RhdGVPZjxTaD5cbiAgICAgICAgICAgIHJldHVybiBydW50aW1lLnNldFN0YXRlKG5leHQpXG4gICAgICAgICAgfSlcbiAgICAgICAgKS5waXBlKFxuICAgICAgICAgIEVmZmVjdC5jYXRjaEFsbENhdXNlKChjYXVzZSkgPT5cbiAgICAgICAgICAgIEVmZmVjdC5sb2dFcnJvcihcIkZsb3cgZXJyb3JcIiwgY2F1c2UpXG4gICAgICAgICAgKVxuICAgICAgICApIGFzIExvZ2ljLk9mPFNoLCBSLCB2b2lkLCBuZXZlcj4sXG4gICAgfSBhcyBPbWl0PExvZ2ljLkludGVudEJ1aWxkZXI8VCwgU2gsIFI+LCBcInBpcGVcIiB8IFwiYW5kVGhlblwiPlxuXG4gICAgY29uc3QgYW5kVGhlbjogTG9naWMuSW50ZW50QnVpbGRlcjxULCBTaCwgUj5bXCJhbmRUaGVuXCJdID0gKFxuICAgICAgaGFuZGxlck9yRWZmOiBhbnksXG4gICAgKTogYW55ID0+IHtcbiAgICAgIGlmICh0eXBlb2YgaGFuZGxlck9yRWZmID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgaWYgKGhhbmRsZXJPckVmZi5sZW5ndGggPj0gMikge1xuICAgICAgICAgIHJldHVybiAoYnVpbGRlciBhcyBhbnkpLnVwZGF0ZShoYW5kbGVyT3JFZmYpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChidWlsZGVyIGFzIGFueSkucnVuKGhhbmRsZXJPckVmZilcbiAgICAgIH1cbiAgICAgIHJldHVybiAoYnVpbGRlciBhcyBhbnkpLnJ1bihoYW5kbGVyT3JFZmYpXG4gICAgfVxuXG4gICAgY29uc3QgcGlwZTogTG9naWMuSW50ZW50QnVpbGRlcjxULCBTaCwgUj5bXCJwaXBlXCJdID0gZnVuY3Rpb24gKHRoaXM6IHVua25vd24pIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBwcmVmZXItcmVzdC1wYXJhbXNcbiAgICAgIGNvbnN0IGZucyA9IGFyZ3VtZW50cyBhcyB1bmtub3duIGFzIFJlYWRvbmx5QXJyYXk8XG4gICAgICAgIChzZWxmOiBMb2dpYy5JbnRlbnRCdWlsZGVyPFQsIFNoLCBSPikgPT4gTG9naWMuSW50ZW50QnVpbGRlcjxULCBTaCwgUj5cbiAgICAgID5cbiAgICAgIGxldCBhY2M6IExvZ2ljLkludGVudEJ1aWxkZXI8VCwgU2gsIFI+ID0gYnVpbGRlciBhcyBMb2dpYy5JbnRlbnRCdWlsZGVyPFxuICAgICAgICBULFxuICAgICAgICBTaCxcbiAgICAgICAgUlxuICAgICAgPlxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYWNjID0gZm5zW2ldKGFjYylcbiAgICAgIH1cbiAgICAgIHJldHVybiBhY2NcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihidWlsZGVyLCB7IHBpcGUsIGFuZFRoZW4gfSkgYXMgTG9naWMuSW50ZW50QnVpbGRlcjxcbiAgICAgIFQsXG4gICAgICBTaCxcbiAgICAgIFJcbiAgICA+XG4gIH1cbn1cbmltcG9ydCB0eXBlIHsgQm91bmRBcGkgfSBmcm9tIFwiLi9jb3JlL21vZHVsZS5qc1wiXG5pbXBvcnQgKiBhcyBNb2R1bGVSdW50aW1lSW1wbCBmcm9tIFwiLi9Nb2R1bGVSdW50aW1lLmpzXCJcblxuLyoqXG4gKiBCb3VuZEFwaSBcdTVCOUVcdTczQjBcdUZGMUFcdTRFM0FcdTY3RDBcdTRFMDBcdTdDN0IgU3RvcmUgU2hhcGUgKyBSdW50aW1lIFx1NTIxQlx1NUVGQVx1OTg4NFx1N0VEMVx1NUI5QVx1NzY4NCBgJGBcdTMwMDJcbiAqXG4gKiBcdThCRjRcdTY2MEVcdUZGMUFcdTdDN0JcdTU3OEJcdTRFMEVcdTUxNjVcdTUzRTNcdTdCN0VcdTU0MERcdTU3MjggYXBpL0JvdW5kQXBpLnRzIFx1NEUyRFx1NThGMFx1NjYwRVx1RkYwQ1x1OEZEOVx1OTFDQ1x1NTNFQVx1NjI3Rlx1OEY3RFx1NTE3N1x1NEY1M1x1NUI5RVx1NzNCMFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZTxTaCBleHRlbmRzIExvZ2l4LkFueU1vZHVsZVNoYXBlLCBSID0gbmV2ZXI+KFxuICBzaGFwZTogU2gsXG4gIHJ1bnRpbWU6IExvZ2l4Lk1vZHVsZVJ1bnRpbWU8TG9naXguU3RhdGVPZjxTaD4sIExvZ2l4LkFjdGlvbk9mPFNoPj4sXG4gIG9wdGlvbnM/OiB7XG4gICAgcmVhZG9ubHkgZ2V0UGhhc2U/OiAoKSA9PiBcInNldHVwXCIgfCBcInJ1blwiXG4gICAgcmVhZG9ubHkgcGhhc2VTZXJ2aWNlPzogTG9naWNEaWFnbm9zdGljcy5Mb2dpY1BoYXNlU2VydmljZVxuICAgIHJlYWRvbmx5IG1vZHVsZUlkPzogc3RyaW5nXG4gIH1cbiAgKTogQm91bmRBcGk8U2gsIFI+IHtcbiAgY29uc3QgZ2V0UGhhc2UgPSBvcHRpb25zPy5nZXRQaGFzZSA/PyAoKCkgPT4gZ2xvYmFsTG9naWNQaGFzZVJlZi5jdXJyZW50KVxuICBjb25zdCBndWFyZFJ1bk9ubHkgPSAoa2luZDogc3RyaW5nLCBhcGk6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHBoYXNlU2VydmljZSA9IG9wdGlvbnM/LnBoYXNlU2VydmljZVxuICAgIGNvbnN0IHBoYXNlID1cbiAgICAgIHBoYXNlU2VydmljZT8uY3VycmVudCA/P1xuICAgICAgKGdsb2JhbExvZ2ljUGhhc2VSZWYuY3VycmVudCA9PT0gXCJzZXR1cFwiXG4gICAgICAgID8gXCJzZXR1cFwiXG4gICAgICAgIDogZ2V0UGhhc2UoKSlcbiAgICBpZiAocGhhc2UgPT09IFwic2V0dXBcIikge1xuICAgICAgdGhyb3cgTG9naWNEaWFnbm9zdGljcy5tYWtlTG9naWNQaGFzZUVycm9yKFxuICAgICAgICBraW5kLFxuICAgICAgICBhcGksXG4gICAgICAgIFwic2V0dXBcIixcbiAgICAgICAgb3B0aW9ucz8ubW9kdWxlSWRcbiAgICAgIClcbiAgICB9XG4gIH1cbiAgY29uc3QgZmxvd0FwaSA9IEZsb3dSdW50aW1lLm1ha2U8U2gsIFI+KHJ1bnRpbWUpXG5cbiAgY29uc3QgbWFrZUludGVudEJ1aWxkZXIgPSAocnVudGltZV86IExvZ2l4Lk1vZHVsZVJ1bnRpbWU8YW55LCBhbnk+KSA9PlxuICAgIExvZ2ljQnVpbGRlckZhY3Rvcnk8U2gsIFI+KHJ1bnRpbWVfKVxuICBjb25zdCB3aXRoTGlmZWN5Y2xlID0gPEE+KFxuICAgIGF2YWlsYWJsZTogKFxuICAgICAgbWFuYWdlcjogTGlmZWN5Y2xlLkxpZmVjeWNsZU1hbmFnZXJcbiAgICApID0+IEVmZmVjdC5FZmZlY3Q8QSwgbmV2ZXIsIGFueT4sXG4gICAgbWlzc2luZzogKCkgPT4gRWZmZWN0LkVmZmVjdDxBLCBuZXZlciwgYW55PlxuICApID0+XG4gICAgRWZmZWN0LnNlcnZpY2VPcHRpb24oTGlmZWN5Y2xlLkxpZmVjeWNsZUNvbnRleHQpLnBpcGUoXG4gICAgICBFZmZlY3QuZmxhdE1hcCgobWF5YmUpID0+XG4gICAgICAgIE9wdGlvbi5tYXRjaChtYXliZSwge1xuICAgICAgICAgIG9uU29tZTogYXZhaWxhYmxlLFxuICAgICAgICAgIG9uTm9uZTogbWlzc2luZyxcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICApXG4gIGNvbnN0IHdpdGhQbGF0Zm9ybSA9IChcbiAgICBpbnZva2U6IChwbGF0Zm9ybTogUGxhdGZvcm0uU2VydmljZSkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkLCBuZXZlciwgYW55PlxuICApID0+XG4gICAgRWZmZWN0LnNlcnZpY2VPcHRpb24oUGxhdGZvcm0uVGFnKS5waXBlKFxuICAgICAgRWZmZWN0LmZsYXRNYXAoKG1heWJlKSA9PlxuICAgICAgICBPcHRpb24ubWF0Y2gobWF5YmUsIHtcbiAgICAgICAgICBvblNvbWU6IGludm9rZSxcbiAgICAgICAgICBvbk5vbmU6ICgpID0+IEVmZmVjdC52b2lkLFxuICAgICAgICB9KVxuICAgICAgKVxuICAgIClcbiAgY29uc3QgY3JlYXRlSW50ZW50QnVpbGRlciA9IDxUPihzdHJlYW06IFN0cmVhbS5TdHJlYW08VD4pID0+XG4gICAgbWFrZUludGVudEJ1aWxkZXIocnVudGltZSkoc3RyZWFtKVxuXG4gIC8qKlxuICAgKiBcdTRFQ0VcdTVGNTNcdTUyNEQgRW52IFx1NjIxNlx1NTE2OFx1NUM0MFx1NkNFOFx1NTE4Q1x1ODg2OFx1NEUyRFx1ODlFM1x1Njc5MFx1NjdEMFx1NEUyQSBNb2R1bGUgXHU3Njg0IFJ1bnRpbWVcdTMwMDJcbiAgICpcbiAgICogXHU0RjE4XHU1MTQ4XHU3RUE3XHVGRjFBXG4gICAqIDEuIFx1NUY1M1x1NTI0RCBFZmZlY3QgXHU3M0FGXHU1ODgzXHU0RTJEXHU1REYyXHU2M0QwXHU0RjlCXHU3Njg0IE1vZHVsZVJ1bnRpbWVcdUZGMDhcdTRGOEJcdTU5ODJcdTkwMUFcdThGQzdcdTVFOTRcdTc1MjhcdTdFQTcgUnVudGltZS5tYWtlIFx1NjIxNiBwcm92aWRlU2VydmljZSBcdTYzRDBcdTRGOUJcdUZGMDlcdUZGMUJcbiAgICogMi4gTW9kdWxlUnVudGltZSBcdTUxNjhcdTVDNDBcdTZDRThcdTUxOENcdTg4NjhcdUZGMDhNb2R1bGVSdW50aW1lLm1ha2UgXHU1MTg1XHU5MEU4XHU3RUY0XHU2MkE0XHVGRjA5XHVGRjBDXHU3NTI4XHU0RThFXHU4REU4IExheWVyIC8gXHU4RkRCXHU3QTBCXHU4QkJGXHU5NUVFXHUzMDAyXG4gICAqL1xuICBjb25zdCByZXNvbHZlTW9kdWxlUnVudGltZSA9IChcbiAgICB0YWc6IENvbnRleHQuVGFnPGFueSwgTG9naXguTW9kdWxlUnVudGltZTxhbnksIGFueT4+XG4gICk6IEVmZmVjdC5FZmZlY3Q8TG9naXguTW9kdWxlUnVudGltZTxhbnksIGFueT4sIG5ldmVyLCBhbnk+ID0+XG4gICAgRWZmZWN0LmdlbihmdW5jdGlvbiogKCkge1xuICAgICAgLy8gMSkgXHU0RjE4XHU1MTQ4XHU1QzFEXHU4QkQ1XHU0RUNFXHU1RjUzXHU1MjREIENvbnRleHQgXHU0RTJEXHU4QkZCXHU1M0Q2XG4gICAgICBjb25zdCBmcm9tRW52ID0geWllbGQqIEVmZmVjdC5zZXJ2aWNlT3B0aW9uKHRhZylcbiAgICAgIGlmIChPcHRpb24uaXNTb21lKGZyb21FbnYpKSB7XG4gICAgICAgIHJldHVybiBmcm9tRW52LnZhbHVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIpIFx1NTZERVx1OTAwMFx1NTIzMFx1NTE2OFx1NUM0MFx1NkNFOFx1NTE4Q1x1ODg2OFx1RkYwOFx1NTQwQ1x1NEUwMFx1OEZEQlx1N0EwQlx1NTE4NVx1NzY4NFx1NTE3Nlx1NEVENiBMYXllciBcdTVERjJcdTUyMURcdTU5Q0JcdTUzMTZcdUZGMDlcbiAgICAgIGNvbnN0IGZyb21SZWdpc3RyeSA9IE1vZHVsZVJ1bnRpbWVJbXBsLmdldFJlZ2lzdGVyZWRSdW50aW1lKHRhZylcbiAgICAgIGlmIChmcm9tUmVnaXN0cnkpIHtcbiAgICAgICAgcmV0dXJuIGZyb21SZWdpc3RyeVxuICAgICAgfVxuXG4gICAgICAvLyAzKSBcdTY1RTBcdTZDRDVcdTYyN0VcdTUyMzBcdTY1RjZcdTc2RjRcdTYzQTUgZGllIFx1MjAxNFx1MjAxNCBcdThGRDlcdTY2MkZcdTkxNERcdTdGNkVcdTk1MTlcdThCRUZcdUZGMENcdTYzRDBcdTc5M0FcdThDMDNcdTc1MjhcdTY1QjlcdTRGRUVcdTZCNjNcdTg4QzVcdTkxNERcdTY1QjlcdTVGMEZcbiAgICAgIHJldHVybiB5aWVsZCogRWZmZWN0LmRpZU1lc3NhZ2UoXG4gICAgICAgIFwiW0JvdW5kQXBpXSBNb2R1bGVSdW50aW1lIG5vdCBmb3VuZCBmb3IgZ2l2ZW4gTW9kdWxlIFRhZy4gXCIgK1xuICAgICAgICAgIFwiRW5zdXJlIHRoZSBtb2R1bGUgaXMgcHJvdmlkZWQgdmlhIGFuIGFwcGxpY2F0aW9uIFJ1bnRpbWUgKFJ1bnRpbWUubWFrZSkgb3IgTW9kdWxlLmxpdmUoKSBpbiB0aGUgY3VycmVudCBwcm9jZXNzLlwiXG4gICAgICApXG4gICAgfSlcblxuICAvLyBcdTRFM0FcdTMwMENcdThGRENcdTdBMEIgTW9kdWxlXHUzMDBEXHU2Nzg0XHU5MDIwXHU1M0VBXHU4QkZCIEJvdW5kIFx1OThDRVx1NjgzQyBBUElcbiAgY29uc3QgbWFrZVJlbW90ZUJvdW5kQXBpID0gPFRhcmdldFNoIGV4dGVuZHMgTG9naXguQW55TW9kdWxlU2hhcGU+KFxuICAgIGhhbmRsZTogTG9naXguTW9kdWxlSGFuZGxlPFRhcmdldFNoPlxuICApID0+IHtcbiAgICBjb25zdCBtYWtlUmVtb3RlT25BY3Rpb24gPSAoXG4gICAgICBzb3VyY2U6IFN0cmVhbS5TdHJlYW08TG9naXguQWN0aW9uT2Y8VGFyZ2V0U2g+PlxuICAgICkgPT5cbiAgICAgIG5ldyBQcm94eSgoKSA9PiB7fSwge1xuICAgICAgICBhcHBseTogKF90YXJnZXQsIF90aGlzQXJnLCBhcmdzKSA9PiB7XG4gICAgICAgICAgY29uc3QgYXJnID0gYXJnc1swXVxuICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVJbnRlbnRCdWlsZGVyKFxuICAgICAgICAgICAgICBzb3VyY2UucGlwZShTdHJlYW0uZmlsdGVyKGFyZyBhcyAoYTogYW55KSA9PiBib29sZWFuKSlcbiAgICAgICAgICAgIClcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVJbnRlbnRCdWlsZGVyKFxuICAgICAgICAgICAgICBzb3VyY2UucGlwZShcbiAgICAgICAgICAgICAgICBTdHJlYW0uZmlsdGVyKFxuICAgICAgICAgICAgICAgICAgKGE6IGFueSkgPT4gYS5fdGFnID09PSBhcmcgfHwgYS50eXBlID09PSBhcmdcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgIClcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09IFwib2JqZWN0XCIgJiYgYXJnICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoXCJfdGFnXCIgaW4gYXJnKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjcmVhdGVJbnRlbnRCdWlsZGVyKFxuICAgICAgICAgICAgICAgIHNvdXJjZS5waXBlKFxuICAgICAgICAgICAgICAgICAgU3RyZWFtLmZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgKGE6IGFueSkgPT4gYS5fdGFnID09PSAoYXJnIGFzIGFueSkuX3RhZ1xuICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKFNjaGVtYS5pc1NjaGVtYShhcmcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjcmVhdGVJbnRlbnRCdWlsZGVyKFxuICAgICAgICAgICAgICAgIHNvdXJjZS5waXBlKFxuICAgICAgICAgICAgICAgICAgU3RyZWFtLmZpbHRlcigoYTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFNjaGVtYS5kZWNvZGVVbmtub3duU3luYyhcbiAgICAgICAgICAgICAgICAgICAgICBhcmcgYXMgU2NoZW1hLlNjaGVtYTxhbnksIGFueSwgbmV2ZXI+XG4gICAgICAgICAgICAgICAgICAgICkoYSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICEhcmVzdWx0XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY3JlYXRlSW50ZW50QnVpbGRlcihzb3VyY2UpXG4gICAgICAgIH0sXG4gICAgICAgIGdldDogKF90YXJnZXQsIHByb3ApID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIHByb3AgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVJbnRlbnRCdWlsZGVyKFxuICAgICAgICAgICAgICBzb3VyY2UucGlwZShcbiAgICAgICAgICAgICAgICBTdHJlYW0uZmlsdGVyKFxuICAgICAgICAgICAgICAgICAgKGE6IGFueSkgPT4gYS5fdGFnID09PSBwcm9wIHx8IGEudHlwZSA9PT0gcHJvcFxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkXG4gICAgICAgIH0sXG4gICAgICB9KVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG9uU3RhdGU6IChzZWxlY3RvcjogKHM6IExvZ2l4LlN0YXRlT2Y8VGFyZ2V0U2g+KSA9PiBhbnkpID0+XG4gICAgICAgIGNyZWF0ZUludGVudEJ1aWxkZXIoaGFuZGxlLmNoYW5nZXMoc2VsZWN0b3IpKSxcbiAgICAgIG9uQWN0aW9uOiBtYWtlUmVtb3RlT25BY3Rpb24oaGFuZGxlLmFjdGlvbnMkKSBhcyBhbnksXG4gICAgICBvbjogKHN0cmVhbTogU3RyZWFtLlN0cmVhbTxhbnk+KSA9PiBjcmVhdGVJbnRlbnRCdWlsZGVyKHN0cmVhbSksXG4gICAgICByZWFkOiBoYW5kbGUucmVhZCxcbiAgICAgIGFjdGlvbnM6IGhhbmRsZS5hY3Rpb25zLFxuICAgICAgYWN0aW9ucyQ6IGhhbmRsZS5hY3Rpb25zJCxcbiAgICB9XG4gIH1cblxuICBjb25zdCBzdGF0ZUFwaTogQm91bmRBcGk8U2gsIFI+W1wic3RhdGVcIl0gPSB7XG4gICAgcmVhZDogcnVudGltZS5nZXRTdGF0ZSxcbiAgICB1cGRhdGU6IChmKSA9PlxuICAgICAgTG9naWMuc2VjdXJlPFNoLCBSLCB2b2lkLCBuZXZlcj4oXG4gICAgICAgIEVmZmVjdC5mbGF0TWFwKHJ1bnRpbWUuZ2V0U3RhdGUsIChwcmV2KSA9PiBydW50aW1lLnNldFN0YXRlKGYocHJldikpKSxcbiAgICAgICAgeyBuYW1lOiBcInN0YXRlLnVwZGF0ZVwiLCBzdG9yZUlkOiBydW50aW1lLmlkIH1cbiAgICAgICksXG4gICAgbXV0YXRlOiAoZikgPT5cbiAgICAgIExvZ2ljLnNlY3VyZTxTaCwgUiwgdm9pZCwgbmV2ZXI+KFxuICAgICAgICBFZmZlY3QuZmxhdE1hcChydW50aW1lLmdldFN0YXRlLCAocHJldikgPT4ge1xuICAgICAgICAgIGNvbnN0IG5leHQgPSBjcmVhdGUocHJldiBhcyBMb2dpeC5TdGF0ZU9mPFNoPiwgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBmKGRyYWZ0IGFzIExvZ2ljLkRyYWZ0PExvZ2l4LlN0YXRlT2Y8U2g+PilcbiAgICAgICAgICB9KSBhcyBMb2dpeC5TdGF0ZU9mPFNoPlxuICAgICAgICAgIHJldHVybiBydW50aW1lLnNldFN0YXRlKG5leHQpXG4gICAgICAgIH0pLFxuICAgICAgICB7IG5hbWU6IFwic3RhdGUubXV0YXRlXCIsIHN0b3JlSWQ6IHJ1bnRpbWUuaWQgfVxuICAgICAgKSxcbiAgICByZWY6IHJ1bnRpbWUucmVmLFxuICB9XG5cbiAgY29uc3QgYWN0aW9uc0FwaSA9IG5ldyBQcm94eSh7fSBhcyBCb3VuZEFwaTxTaCwgUj5bXCJhY3Rpb25zXCJdLCB7XG4gICAgZ2V0OiAoX3RhcmdldCwgcHJvcCkgPT4ge1xuICAgICAgaWYgKHByb3AgPT09IFwiZGlzcGF0Y2hcIikge1xuICAgICAgICByZXR1cm4gKGE6IExvZ2l4LkFjdGlvbk9mPFNoPikgPT4gcnVudGltZS5kaXNwYXRjaChhKVxuICAgICAgfVxuICAgICAgaWYgKHByb3AgPT09IFwiYWN0aW9ucyRcIikge1xuICAgICAgICByZXR1cm4gcnVudGltZS5hY3Rpb25zJFxuICAgICAgfVxuICAgICAgcmV0dXJuIChwYXlsb2FkOiBhbnkpID0+XG4gICAgICAgIHJ1bnRpbWUuZGlzcGF0Y2goeyBfdGFnOiBwcm9wIGFzIHN0cmluZywgcGF5bG9hZCB9IGFzIExvZ2l4LkFjdGlvbk9mPFNoPilcbiAgICB9LFxuICB9KVxuXG4gIGNvbnN0IG1hdGNoQXBpID0gPFY+KHZhbHVlOiBWKTogTG9naWMuRmx1ZW50TWF0Y2g8Vj4gPT5cbiAgICBNYXRjaEJ1aWxkZXIubWFrZU1hdGNoKHZhbHVlKVxuXG4gIGNvbnN0IG1hdGNoVGFnQXBpID0gPFYgZXh0ZW5kcyB7IF90YWc6IHN0cmluZyB9PihcbiAgICB2YWx1ZTogVlxuICApOiBMb2dpYy5GbHVlbnRNYXRjaFRhZzxWPiA9PiBNYXRjaEJ1aWxkZXIubWFrZU1hdGNoVGFnKHZhbHVlKVxuXG4gIC8vIFByaW1hcnkgUmVkdWNlciBcdTZDRThcdTUxOENcdUZGMUFcdTkwMUFcdThGQzcgcnVudGltZSBcdTRFMEFcdTc2ODRcdTUxODVcdTkwRThcdTZDRThcdTUxOENcdTUxRkRcdTY1NzBcdUZGMDhcdTgyRTVcdTVCNThcdTU3MjhcdUZGMDlcdTUxOTlcdTUxNjUgcmVkdWNlciBcdTY2MjBcdTVDMDRcdTMwMDJcbiAgY29uc3QgcmVkdWNlcjogQm91bmRBcGk8U2gsIFI+W1wicmVkdWNlclwiXSA9ICh0YWcsIGZuKSA9PiB7XG4gICAgcmV0dXJuIExvZ2ljLnNlY3VyZTxTaCwgUiwgdm9pZCwgbmV2ZXI+KFxuICAgICAgRWZmZWN0LnN5bmMoKCkgPT4ge1xuICAgICAgICBjb25zdCBhbnlSdW50aW1lID0gcnVudGltZSBhcyBhbnlcbiAgICAgICAgY29uc3QgcmVnaXN0ZXI6ICh0OiBzdHJpbmcsIGZuOiAoczogYW55LCBhOiBhbnkpID0+IGFueSkgPT4gdm9pZCA9XG4gICAgICAgICAgYW55UnVudGltZSAmJiBhbnlSdW50aW1lLl9fcmVnaXN0ZXJSZWR1Y2VyXG4gICAgICAgIGlmICghcmVnaXN0ZXIpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBcIltCb3VuZEFwaS5yZWR1Y2VyXSBQcmltYXJ5IHJlZHVjZXIgcmVnaXN0cmF0aW9uIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhpcyBydW50aW1lIFwiICtcbiAgICAgICAgICAgICAgXCIobWlzc2luZyBpbnRlcm5hbCBfX3JlZ2lzdGVyUmVkdWNlciBob29rKS5cIlxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgICByZWdpc3RlcihTdHJpbmcodGFnKSwgZm4gYXMgYW55KVxuICAgICAgfSksXG4gICAgICB7IG5hbWU6IFwic3RhdGUucmVkdWNlclwiLCBzdG9yZUlkOiBydW50aW1lLmlkIH1cbiAgICApXG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN0YXRlOiBzdGF0ZUFwaSxcbiAgICBhY3Rpb25zOiBhY3Rpb25zQXBpLFxuICAgIGZsb3c6IGZsb3dBcGksXG4gICAgbWF0Y2g6IG1hdGNoQXBpLFxuICAgIG1hdGNoVGFnOiBtYXRjaFRhZ0FwaSxcbiAgICBsaWZlY3ljbGU6IHtcbiAgICAgIG9uSW5pdDogKGVmZikgPT4ge1xuICAgICAgICAvLyBQaGFzZSBHdWFyZFx1RkYxQSQubGlmZWN5Y2xlLm9uSW5pdCBcdTg5QzZcdTRFM0EgcnVuLW9ubHkgXHU4MEZEXHU1MjlCXHVGRjBDXHU3OTgxXHU2QjYyXHU1NzI4IHNldHVwIFx1NkJCNVx1NjI2N1x1ODg0Q1x1MzAwMlxuICAgICAgICAvLyBcdTUxNzhcdTU3OEJcdTUzOUZcdTU2RTBcdUZGMUFcbiAgICAgICAgLy8gLSBzZXR1cCBcdTZCQjVcdTkwMUFcdTVFMzhcdTU3MjggUnVudGltZSBcdTY3ODRcdTkwMjBcdThERUZcdTVGODRcdUZGMDhydW5TeW5jXHVGRjA5XHU0RTJEXHU2MjY3XHU4ODRDXHVGRjBDcnVubmluZyBcdTU0MkJcdTVGMDJcdTZCNjVcdTVERTVcdTRGNUNcdTc2ODQgb25Jbml0XG4gICAgICAgIC8vICAgXHU2NzgxXHU2NjEzXHU4OUU2XHU1M0QxIEFzeW5jRmliZXJFeGNlcHRpb25cdUZGMUJcbiAgICAgICAgLy8gLSBcdTYzMDkgdjMgXHU3RUE2XHU1QjlBXHVGRjBDb25Jbml0IFx1NjZGNFx1NjNBNVx1OEZEMVx1MjAxQ1x1NkEyMVx1NTc1N1x1OEZEMFx1ODg0Q1x1NjcxRlx1NzY4NFx1NTIxRFx1NTlDQlx1NTMxNlx1NkQ0MVx1N0EwQlx1MjAxRFx1RkYwQ1x1OEJFRFx1NEU0OVx1NEUwQVx1NUM1RVx1NEU4RSBydW4gXHU2QkI1XHUzMDAyXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFx1NTZFMFx1NkI2NFx1NTcyOCBzZXR1cCBcdTZCQjVcdThDMDNcdTc1MjhcdTY1RjZcdTYyOUJcdTUxRkEgTG9naWNQaGFzZUVycm9yXHVGRjBDXHU1RTc2XHU3NTMxIE1vZHVsZVJ1bnRpbWUubWFrZSAvXG4gICAgICAgIC8vIExvZ2ljRGlhZ25vc3RpY3MgXHU2NTM2XHU2NTVCXHU0RTNBIGxvZ2ljOjppbnZhbGlkX3BoYXNlIFx1OEJDQVx1NjVBRFx1RkYwQ1x1ODAwQ1x1NEUwRFx1NjYyRlx1OEJBOVx1NUU5NVx1NUM0MiBydW5TeW5jIFx1NTkzMVx1OEQyNVx1MzAwMlxuICAgICAgICBndWFyZFJ1bk9ubHkoXCJsaWZlY3ljbGVfaW5fc2V0dXBcIiwgXCIkLmxpZmVjeWNsZS5vbkluaXRcIilcblxuICAgICAgICByZXR1cm4gd2l0aExpZmVjeWNsZShcbiAgICAgICAgICAobWFuYWdlcikgPT4gbWFuYWdlci5yZWdpc3RlckluaXQoZWZmKSxcbiAgICAgICAgICAoKSA9PiBlZmZcbiAgICAgICAgKSBhcyB1bmtub3duIGFzIExvZ2ljLk9mPFNoLCBSLCB2b2lkLCBuZXZlcj5cbiAgICAgIH0sXG4gICAgICBvbkRlc3Ryb3k6IChlZmYpID0+XG4gICAgICAgIHdpdGhMaWZlY3ljbGUoXG4gICAgICAgICAgKG1hbmFnZXIpID0+IG1hbmFnZXIucmVnaXN0ZXJEZXN0cm95KGVmZiksXG4gICAgICAgICAgKCkgPT4gZWZmXG4gICAgICAgICkgYXMgdW5rbm93biBhcyBMb2dpYy5PZjxTaCwgUiwgdm9pZCwgbmV2ZXI+LFxuICAgICAgb25FcnJvcjogKGhhbmRsZXIpID0+XG4gICAgICAgIHdpdGhMaWZlY3ljbGUoXG4gICAgICAgICAgKG1hbmFnZXIpID0+IG1hbmFnZXIucmVnaXN0ZXJPbkVycm9yKGhhbmRsZXIpLFxuICAgICAgICAgICgpID0+IEVmZmVjdC52b2lkXG4gICAgICAgICkgYXMgdW5rbm93biBhcyBMb2dpYy5PZjxTaCwgUiwgdm9pZCwgbmV2ZXI+LFxuICAgICAgb25TdXNwZW5kOiAoZWZmKSA9PlxuICAgICAgICB3aXRoUGxhdGZvcm0oKHBsYXRmb3JtKSA9PlxuICAgICAgICAgIHBsYXRmb3JtLmxpZmVjeWNsZS5vblN1c3BlbmQoXG4gICAgICAgICAgICBFZmZlY3QuYXNWb2lkKGVmZiBhcyBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+KVxuICAgICAgICAgIClcbiAgICAgICAgKSBhcyB1bmtub3duIGFzIExvZ2ljLk9mPFNoLCBSLCB2b2lkLCBuZXZlcj4sXG4gICAgICBvblJlc3VtZTogKGVmZikgPT5cbiAgICAgICAgd2l0aFBsYXRmb3JtKChwbGF0Zm9ybSkgPT5cbiAgICAgICAgICBwbGF0Zm9ybS5saWZlY3ljbGUub25SZXN1bWUoXG4gICAgICAgICAgICBFZmZlY3QuYXNWb2lkKGVmZiBhcyBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+KVxuICAgICAgICAgIClcbiAgICAgICAgKSBhcyB1bmtub3duIGFzIExvZ2ljLk9mPFNoLCBSLCB2b2lkLCBuZXZlcj4sXG4gICAgICBvblJlc2V0OiAoZWZmKSA9PlxuICAgICAgICB3aXRoUGxhdGZvcm0oKHBsYXRmb3JtKSA9PlxuICAgICAgICAgIHBsYXRmb3JtLmxpZmVjeWNsZS5vblJlc2V0XG4gICAgICAgICAgICA/IHBsYXRmb3JtLmxpZmVjeWNsZS5vblJlc2V0KFxuICAgICAgICAgICAgICAgIEVmZmVjdC5hc1ZvaWQoZWZmIGFzIEVmZmVjdC5FZmZlY3Q8dm9pZCwgbmV2ZXIsIGFueT4pXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgIDogRWZmZWN0LnZvaWRcbiAgICAgICAgKSBhcyB1bmtub3duIGFzIExvZ2ljLk9mPFNoLCBSLCB2b2lkLCBuZXZlcj4sXG4gICAgfSxcbiAgICByZWR1Y2VyLFxuICAgIHVzZTogbmV3IFByb3h5KCgpID0+IHt9LCB7XG4gICAgICBhcHBseTogKF90YXJnZXQsIF90aGlzQXJnLCBbYXJnXSkgPT4ge1xuICAgICAgICBndWFyZFJ1bk9ubHkoXCJ1c2VfaW5fc2V0dXBcIiwgXCIkLnVzZVwiKVxuICAgICAgICBpZiAoQ29udGV4dC5pc1RhZyhhcmcpKSB7XG4gICAgICAgICAgY29uc3QgY2FuZGlkYXRlID0gYXJnIGFzIHsgX2tpbmQ/OiB1bmtub3duIH1cblxuICAgICAgICAgIC8vIE1vZHVsZVx1RkYxQVx1OEZENFx1NTZERVx1NTNFQVx1OEJGQiBNb2R1bGVIYW5kbGUgXHU4OUM2XHU1NkZFXG4gICAgICAgICAgaWYgKGNhbmRpZGF0ZS5fa2luZCA9PT0gXCJNb2R1bGVcIikge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmVNb2R1bGVSdW50aW1lKGFyZyBhcyBhbnkpLnBpcGUoXG4gICAgICAgICAgICAgIEVmZmVjdC5tYXAoKHJ1bnRpbWU6IExvZ2l4Lk1vZHVsZVJ1bnRpbWU8YW55LCBhbnk+KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9uc1Byb3h5OiBMb2dpeC5Nb2R1bGVIYW5kbGU8YW55PltcImFjdGlvbnNcIl0gPVxuICAgICAgICAgICAgICAgICAgbmV3IFByb3h5KFxuICAgICAgICAgICAgICAgICAgICB7fSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIGdldDogKF90YXJnZXQsIHByb3ApID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAocGF5bG9hZDogdW5rbm93bikgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgcnVudGltZS5kaXNwYXRjaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RhZzogcHJvcCBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF5bG9hZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICApIGFzIExvZ2l4Lk1vZHVsZUhhbmRsZTxhbnk+W1wiYWN0aW9uc1wiXVxuXG4gICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlOiBMb2dpeC5Nb2R1bGVIYW5kbGU8YW55PiA9IHtcbiAgICAgICAgICAgICAgICAgIHJlYWQ6IChzZWxlY3RvcikgPT5cbiAgICAgICAgICAgICAgICAgICAgRWZmZWN0Lm1hcChydW50aW1lLmdldFN0YXRlLCBzZWxlY3RvciksXG4gICAgICAgICAgICAgICAgICBjaGFuZ2VzOiBydW50aW1lLmNoYW5nZXMsXG4gICAgICAgICAgICAgICAgICBkaXNwYXRjaDogcnVudGltZS5kaXNwYXRjaCxcbiAgICAgICAgICAgICAgICAgIGFjdGlvbnMkOiBydW50aW1lLmFjdGlvbnMkLFxuICAgICAgICAgICAgICAgICAgYWN0aW9uczogYWN0aW9uc1Byb3h5LFxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICApIGFzIHVua25vd24gYXMgTG9naWMuT2Y8U2gsIFIsIGFueSwgbmV2ZXI+XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gXHU2NjZFXHU5MDFBIFNlcnZpY2UgVGFnXHVGRjFBXHU3NkY0XHU2M0E1XHU0RUNFIEVudiBcdTgzQjdcdTUzRDYgU2VydmljZVxuICAgICAgICAgIHJldHVybiBhcmcgYXMgdW5rbm93biBhcyBMb2dpYy5PZjxTaCwgUiwgYW55LCBuZXZlcj5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRWZmZWN0LmRpZShcIkJvdW5kQXBpLnVzZTogdW5zdXBwb3J0ZWQgYXJndW1lbnRcIikgYXMgdW5rbm93biBhcyBMb2dpYy5PZjxcbiAgICAgICAgICBTaCxcbiAgICAgICAgICBSLFxuICAgICAgICAgIGFueSxcbiAgICAgICAgICBuZXZlclxuICAgICAgICA+XG4gICAgICB9LFxuICAgIH0pIGFzIHVua25vd24gYXMgQm91bmRBcGk8U2gsIFI+W1widXNlXCJdLFxuICAgIHVzZVJlbW90ZTogKChtb2R1bGU6IGFueSkgPT4ge1xuICAgICAgaWYgKCFDb250ZXh0LmlzVGFnKG1vZHVsZSkpIHtcbiAgICAgICAgcmV0dXJuIEVmZmVjdC5kaWUoXG4gICAgICAgICAgXCJCb3VuZEFwaS51c2VSZW1vdGU6IGV4cGVjdGVkIGEgTW9kdWxlSW5zdGFuY2UgVGFnXCIsXG4gICAgICAgICkgYXMgdW5rbm93biBhcyBMb2dpYy5PZjxTaCwgUiwgYW55LCBuZXZlcj5cbiAgICAgIH1cblxuICAgICAgY29uc3QgY2FuZGlkYXRlID0gbW9kdWxlIGFzIHsgX2tpbmQ/OiB1bmtub3duIH1cbiAgICAgIGlmIChjYW5kaWRhdGUuX2tpbmQgIT09IFwiTW9kdWxlXCIpIHtcbiAgICAgICAgcmV0dXJuIEVmZmVjdC5kaWUoXG4gICAgICAgICAgXCJCb3VuZEFwaS51c2VSZW1vdGU6IGV4cGVjdGVkIGEgTW9kdWxlSW5zdGFuY2Ugd2l0aCBfa2luZCA9ICdNb2R1bGUnXCIsXG4gICAgICAgICkgYXMgdW5rbm93biBhcyBMb2dpYy5PZjxTaCwgUiwgYW55LCBuZXZlcj5cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc29sdmVNb2R1bGVSdW50aW1lKFxuICAgICAgICBtb2R1bGUgYXMgQ29udGV4dC5UYWc8YW55LCBMb2dpeC5Nb2R1bGVSdW50aW1lPGFueSwgYW55Pj5cbiAgICAgICkucGlwZShcbiAgICAgICAgRWZmZWN0Lm1hcCgocmVtb3RlUnVudGltZTogTG9naXguTW9kdWxlUnVudGltZTxhbnksIGFueT4pID0+IHtcbiAgICAgICAgICBjb25zdCBhY3Rpb25zUHJveHk6IExvZ2l4Lk1vZHVsZUhhbmRsZTxhbnk+W1wiYWN0aW9uc1wiXSA9IG5ldyBQcm94eShcbiAgICAgICAgICAgIHt9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBnZXQ6IChfdGFyZ2V0LCBwcm9wKSA9PlxuICAgICAgICAgICAgICAgIChwYXlsb2FkOiB1bmtub3duKSA9PlxuICAgICAgICAgICAgICAgICAgcmVtb3RlUnVudGltZS5kaXNwYXRjaCh7XG4gICAgICAgICAgICAgICAgICAgIF90YWc6IHByb3AgYXMgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBwYXlsb2FkLFxuICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICkgYXMgTG9naXguTW9kdWxlSGFuZGxlPGFueT5bXCJhY3Rpb25zXCJdXG5cbiAgICAgICAgICBjb25zdCBoYW5kbGU6IExvZ2l4Lk1vZHVsZUhhbmRsZTxhbnk+ID0ge1xuICAgICAgICAgICAgcmVhZDogKHNlbGVjdG9yKSA9PlxuICAgICAgICAgICAgICBFZmZlY3QubWFwKHJlbW90ZVJ1bnRpbWUuZ2V0U3RhdGUsIHNlbGVjdG9yKSxcbiAgICAgICAgICAgIGNoYW5nZXM6IHJlbW90ZVJ1bnRpbWUuY2hhbmdlcyxcbiAgICAgICAgICAgIGRpc3BhdGNoOiByZW1vdGVSdW50aW1lLmRpc3BhdGNoLFxuICAgICAgICAgICAgYWN0aW9ucyQ6IHJlbW90ZVJ1bnRpbWUuYWN0aW9ucyQsXG4gICAgICAgICAgICBhY3Rpb25zOiBhY3Rpb25zUHJveHksXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG1ha2VSZW1vdGVCb3VuZEFwaShoYW5kbGUpXG4gICAgICAgIH0pLFxuICAgICAgKSBhcyB1bmtub3duIGFzIExvZ2ljLk9mPFNoLCBSLCBhbnksIG5ldmVyPlxuICAgIH0pIGFzIHVua25vd24gYXMgQm91bmRBcGk8U2gsIFI+W1widXNlUmVtb3RlXCJdLFxuICAgIG9uQWN0aW9uOiBuZXcgUHJveHkoKCkgPT4ge30sIHtcbiAgICAgIGFwcGx5OiAoX3RhcmdldCwgX3RoaXNBcmcsIGFyZ3MpID0+IHtcbiAgICAgICAgZ3VhcmRSdW5Pbmx5KFwidXNlX2luX3NldHVwXCIsIFwiJC5vbkFjdGlvblwiKVxuICAgICAgICBjb25zdCBhcmcgPSBhcmdzWzBdXG4gICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlSW50ZW50QnVpbGRlcihcbiAgICAgICAgICAgIHJ1bnRpbWUuYWN0aW9ucyQucGlwZShTdHJlYW0uZmlsdGVyKGFyZykpXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUludGVudEJ1aWxkZXIoXG4gICAgICAgICAgICBydW50aW1lLmFjdGlvbnMkLnBpcGUoXG4gICAgICAgICAgICAgIFN0cmVhbS5maWx0ZXIoKGE6IGFueSkgPT4gYS5fdGFnID09PSBhcmcgfHwgYS50eXBlID09PSBhcmcpXG4gICAgICAgICAgICApXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiICYmIGFyZyAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmIChcIl90YWdcIiBpbiBhcmcpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVJbnRlbnRCdWlsZGVyKFxuICAgICAgICAgICAgICBydW50aW1lLmFjdGlvbnMkLnBpcGUoXG4gICAgICAgICAgICAgICAgU3RyZWFtLmZpbHRlcigoYTogYW55KSA9PiBhLl90YWcgPT09IChhcmcgYXMgYW55KS5fdGFnKVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICApXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChTY2hlbWEuaXNTY2hlbWEoYXJnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUludGVudEJ1aWxkZXIoXG4gICAgICAgICAgICAgIHJ1bnRpbWUuYWN0aW9ucyQucGlwZShcbiAgICAgICAgICAgICAgICBTdHJlYW0uZmlsdGVyKChhOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFNjaGVtYS5kZWNvZGVVbmtub3duU3luYyhcbiAgICAgICAgICAgICAgICAgICAgYXJnIGFzIFNjaGVtYS5TY2hlbWE8YW55LCBhbnksIG5ldmVyPlxuICAgICAgICAgICAgICAgICAgKShhKVxuICAgICAgICAgICAgICAgICAgcmV0dXJuICEhcmVzdWx0XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3JlYXRlSW50ZW50QnVpbGRlcihydW50aW1lLmFjdGlvbnMkKVxuICAgICAgfSxcbiAgICAgIGdldDogKF90YXJnZXQsIHByb3ApID0+IHtcbiAgICAgICAgZ3VhcmRSdW5Pbmx5KFwidXNlX2luX3NldHVwXCIsIFwiJC5vbkFjdGlvblwiKVxuICAgICAgICBpZiAodHlwZW9mIHByb3AgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlSW50ZW50QnVpbGRlcihcbiAgICAgICAgICAgIHJ1bnRpbWUuYWN0aW9ucyQucGlwZShcbiAgICAgICAgICAgICAgU3RyZWFtLmZpbHRlcihcbiAgICAgICAgICAgICAgICAoYTogYW55KSA9PiBhLl90YWcgPT09IHByb3AgfHwgYS50eXBlID09PSBwcm9wXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgICAgfSxcbiAgICB9KSBhcyB1bmtub3duIGFzIEJvdW5kQXBpPFNoLCBSPltcIm9uQWN0aW9uXCJdLFxuICAgIG9uU3RhdGU6IChzZWxlY3RvcikgPT4ge1xuICAgICAgZ3VhcmRSdW5Pbmx5KFwidXNlX2luX3NldHVwXCIsIFwiJC5vblN0YXRlXCIpXG4gICAgICByZXR1cm4gY3JlYXRlSW50ZW50QnVpbGRlcihydW50aW1lLmNoYW5nZXMoc2VsZWN0b3IpKVxuICAgIH0sXG4gICAgb246IChzdHJlYW0pID0+IHtcbiAgICAgIGd1YXJkUnVuT25seShcInVzZV9pbl9zZXR1cFwiLCBcIiQub25cIilcbiAgICAgIHJldHVybiBjcmVhdGVJbnRlbnRCdWlsZGVyKHN0cmVhbSlcbiAgICB9LFxuICB9XG59XG4iLCAiaW1wb3J0IHsgRWZmZWN0LCBTdHJlYW0gfSBmcm9tICdlZmZlY3QnXG5pbXBvcnQgdHlwZSAqIGFzIExvZ2l4IGZyb20gJy4vbW9kdWxlLmpzJ1xuaW1wb3J0ICogYXMgUGxhdGZvcm0gZnJvbSAnLi9QbGF0Zm9ybS5qcydcblxuLy8gTG9naWMgXHU1MTg1XHU2ODM4XHU3QzdCXHU1NzhCXHU0RTBFXHU0RTJEXHU5NUY0XHU0RUY2XHVGRjA4XHU0RjlCIExvZ2ljIC8gQm91bmQgLyBGbG93IFx1N0I0OVx1NkEyMVx1NTc1N1x1NTkwRFx1NzUyOFx1RkYwOVxuXG5leHBvcnQgdHlwZSBFbnY8U2ggZXh0ZW5kcyBMb2dpeC5BbnlNb2R1bGVTaGFwZSwgUj4gPSBMb2dpeC5Nb2R1bGVUYWc8U2g+IHwgUGxhdGZvcm0uU2VydmljZSB8IFJcblxuZXhwb3J0IHR5cGUgT2Y8U2ggZXh0ZW5kcyBMb2dpeC5BbnlNb2R1bGVTaGFwZSwgUiA9IG5ldmVyLCBBID0gdm9pZCwgRSA9IG5ldmVyPiA9IEVmZmVjdC5FZmZlY3Q8QSwgRSwgRW52PFNoLCBSPj5cblxuZXhwb3J0IHR5cGUgRHJhZnQ8VD4gPSB7XG4gIC1yZWFkb25seSBbSyBpbiBrZXlvZiBUXTogRHJhZnQ8VFtLXT5cbn1cblxuZXhwb3J0IHR5cGUgQW5kVGhlblVwZGF0ZUhhbmRsZXI8U2ggZXh0ZW5kcyBMb2dpeC5BbnlNb2R1bGVTaGFwZSwgUGF5bG9hZCwgRSA9IGFueSwgUjIgPSBhbnk+ID0gKFxuICBwcmV2OiBMb2dpeC5TdGF0ZU9mPFNoPixcbiAgcGF5bG9hZDogUGF5bG9hZCxcbikgPT4gTG9naXguU3RhdGVPZjxTaD4gfCBFZmZlY3QuRWZmZWN0PExvZ2l4LlN0YXRlT2Y8U2g+LCBFLCBSMj5cblxuZXhwb3J0IGludGVyZmFjZSBJbnRlbnRCdWlsZGVyPFBheWxvYWQsIFNoIGV4dGVuZHMgTG9naXguQW55TW9kdWxlU2hhcGUsIFIgPSBuZXZlcj4ge1xuICByZWFkb25seSBkZWJvdW5jZTogKG1zOiBudW1iZXIpID0+IEludGVudEJ1aWxkZXI8UGF5bG9hZCwgU2gsIFI+XG4gIHJlYWRvbmx5IHRocm90dGxlOiAobXM6IG51bWJlcikgPT4gSW50ZW50QnVpbGRlcjxQYXlsb2FkLCBTaCwgUj5cbiAgcmVhZG9ubHkgZmlsdGVyOiAocHJlZGljYXRlOiAodmFsdWU6IFBheWxvYWQpID0+IGJvb2xlYW4pID0+IEludGVudEJ1aWxkZXI8UGF5bG9hZCwgU2gsIFI+XG4gIHJlYWRvbmx5IG1hcDogPFU+KGY6ICh2YWx1ZTogUGF5bG9hZCkgPT4gVSkgPT4gSW50ZW50QnVpbGRlcjxVLCBTaCwgUj5cblxuICByZWFkb25seSBydW46IDxBID0gdm9pZCwgRSA9IG5ldmVyLCBSMiA9IHVua25vd24+KFxuICAgIGVmZmVjdDogT2Y8U2gsIFIgJiBSMiwgQSwgRT4gfCAoKHA6IFBheWxvYWQpID0+IE9mPFNoLCBSICYgUjIsIEEsIEU+KSxcbiAgKSA9PiBPZjxTaCwgUiAmIFIyLCB2b2lkLCBFPlxuXG4gIHJlYWRvbmx5IHJ1blBhcmFsbGVsOiA8QSA9IHZvaWQsIEUgPSBuZXZlciwgUjIgPSB1bmtub3duPihcbiAgICBlZmZlY3Q6IE9mPFNoLCBSICYgUjIsIEEsIEU+IHwgKChwOiBQYXlsb2FkKSA9PiBPZjxTaCwgUiAmIFIyLCBBLCBFPiksXG4gICkgPT4gT2Y8U2gsIFIgJiBSMiwgdm9pZCwgRT5cblxuICByZWFkb25seSBydW5MYXRlc3Q6IDxBID0gdm9pZCwgRSA9IG5ldmVyLCBSMiA9IHVua25vd24+KFxuICAgIGVmZmVjdDogT2Y8U2gsIFIgJiBSMiwgQSwgRT4gfCAoKHA6IFBheWxvYWQpID0+IE9mPFNoLCBSICYgUjIsIEEsIEU+KSxcbiAgKSA9PiBPZjxTaCwgUiAmIFIyLCB2b2lkLCBFPlxuXG4gIHJlYWRvbmx5IHJ1bkV4aGF1c3Q6IDxBID0gdm9pZCwgRSA9IG5ldmVyLCBSMiA9IHVua25vd24+KFxuICAgIGVmZmVjdDogT2Y8U2gsIFIgJiBSMiwgQSwgRT4gfCAoKHA6IFBheWxvYWQpID0+IE9mPFNoLCBSICYgUjIsIEEsIEU+KSxcbiAgKSA9PiBPZjxTaCwgUiAmIFIyLCB2b2lkLCBFPlxuXG4gIC8qKiBGb3JrIGEgd2F0Y2hlciB0aGF0IHJ1bnMgaW4gdGhlIE1vZHVsZVJ1bnRpbWUgU2NvcGUgKGVxdWl2YWxlbnQgdG8gRWZmZWN0LmZvcmtTY29wZWQgKyBydW4pICovXG4gIHJlYWRvbmx5IHJ1bkZvcms6IDxBID0gdm9pZCwgRSA9IG5ldmVyLCBSMiA9IHVua25vd24+KFxuICAgIGVmZmVjdDogT2Y8U2gsIFIgJiBSMiwgQSwgRT4gfCAoKHA6IFBheWxvYWQpID0+IE9mPFNoLCBSICYgUjIsIEEsIEU+KSxcbiAgKSA9PiBPZjxTaCwgUiAmIFIyLCB2b2lkLCBFPlxuXG4gIC8qKiBGb3JrIGEgd2F0Y2hlciB3aXRoIHBhcmFsbGVsIGV2ZW50IHByb2Nlc3NpbmcgKGVxdWl2YWxlbnQgdG8gRWZmZWN0LmZvcmtTY29wZWQgKyBydW5QYXJhbGxlbCkgKi9cbiAgcmVhZG9ubHkgcnVuUGFyYWxsZWxGb3JrOiA8QSA9IHZvaWQsIEUgPSBuZXZlciwgUjIgPSB1bmtub3duPihcbiAgICBlZmZlY3Q6IE9mPFNoLCBSICYgUjIsIEEsIEU+IHwgKChwOiBQYXlsb2FkKSA9PiBPZjxTaCwgUiAmIFIyLCBBLCBFPiksXG4gICkgPT4gT2Y8U2gsIFIgJiBSMiwgdm9pZCwgRT5cblxuICByZWFkb25seSB1cGRhdGU6IChcbiAgICByZWR1Y2VyOiAoXG4gICAgICBwcmV2OiBMb2dpeC5TdGF0ZU9mPFNoPixcbiAgICAgIHBheWxvYWQ6IFBheWxvYWQsXG4gICAgKSA9PiBMb2dpeC5TdGF0ZU9mPFNoPiB8IEVmZmVjdC5FZmZlY3Q8TG9naXguU3RhdGVPZjxTaD4sIGFueSwgYW55PixcbiAgKSA9PiBPZjxTaCwgUiwgdm9pZCwgbmV2ZXI+XG5cbiAgcmVhZG9ubHkgbXV0YXRlOiAocmVkdWNlcjogKGRyYWZ0OiBEcmFmdDxMb2dpeC5TdGF0ZU9mPFNoPj4sIHBheWxvYWQ6IFBheWxvYWQpID0+IHZvaWQpID0+IE9mPFNoLCBSLCB2b2lkLCBuZXZlcj5cblxuICByZWFkb25seSBhbmRUaGVuOiB7XG4gICAgPEUgPSBuZXZlciwgUjIgPSBuZXZlcj4oaGFuZGxlcjogQW5kVGhlblVwZGF0ZUhhbmRsZXI8U2gsIFBheWxvYWQsIEUsIFIyPik6IE9mPFNoLCBSICYgUjIsIHZvaWQsIEU+XG5cbiAgICA8QSA9IHZvaWQsIEUgPSBuZXZlciwgUjIgPSBuZXZlcj4oXG4gICAgICBlZmZlY3Q6IE9mPFNoLCBSICYgUjIsIEEsIEU+IHwgKChwOiBQYXlsb2FkKSA9PiBPZjxTaCwgUiAmIFIyLCBBLCBFPiksXG4gICAgKTogT2Y8U2gsIFIgJiBSMiwgdm9pZCwgRT5cbiAgfVxuXG4gIHJlYWRvbmx5IHBpcGU6IChcbiAgICAuLi5mbnM6IFJlYWRvbmx5QXJyYXk8KHNlbGY6IEludGVudEJ1aWxkZXI8UGF5bG9hZCwgU2gsIFI+KSA9PiBJbnRlbnRCdWlsZGVyPFBheWxvYWQsIFNoLCBSPj5cbiAgKSA9PiBJbnRlbnRCdWlsZGVyPFBheWxvYWQsIFNoLCBSPlxuXG4gIHJlYWRvbmx5IHRvU3RyZWFtOiAoKSA9PiBTdHJlYW0uU3RyZWFtPFBheWxvYWQ+XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmx1ZW50TWF0Y2g8Vj4ge1xuICByZWFkb25seSB3aXRoOiA8QT4ocGF0dGVybjogKHZhbHVlOiBWKSA9PiBib29sZWFuLCBoYW5kbGVyOiAodmFsdWU6IFYpID0+IEEpID0+IEZsdWVudE1hdGNoPFY+XG4gIHJlYWRvbmx5IG90aGVyd2lzZTogPEE+KGhhbmRsZXI6ICh2YWx1ZTogVikgPT4gQSkgPT4gQVxuICAvKipcbiAgICogXHU1RjNBXHU1MjM2XHU4OTgxXHU2QzQyXHU4MUYzXHU1QzExXHU1MzM5XHU5MTREXHU0RTAwXHU0RTJBXHU1MjA2XHU2NTJGXHVGRjFBXG4gICAqIC0gXHU4MkU1XHU1REYyXHU2NzA5IHdpdGggXHU1MjA2XHU2NTJGXHU1NDdEXHU0RTJEXHVGRjBDXHU1MjE5XHU4RkQ0XHU1NkRFXHU4QkU1XHU1MjA2XHU2NTJGXHU3Njg0XHU3RUQzXHU2NzlDXHVGRjA4XHU5MDFBXHU1RTM4XHU2NjJGIEVmZmVjdFx1RkYwOVx1RkYxQlxuICAgKiAtIFx1ODJFNVx1NjVFMFx1NTIwNlx1NjUyRlx1NTQ3RFx1NEUyRFx1RkYwQ1x1NTIxOVx1OEZENFx1NTZERVx1NEUwMFx1NEUyQVx1NTkzMVx1OEQyNVx1NzY4NCBFZmZlY3RcdTMwMDJcbiAgICpcbiAgICogXHU3RUE2XHU1QjlBXHU0RUM1XHU1NzI4IGhhbmRsZXIgXHU4RkQ0XHU1NkRFIEVmZmVjdCBcdTY1RjZcdTRGN0ZcdTc1MjhcdTMwMDJcbiAgICovXG4gIHJlYWRvbmx5IGV4aGF1c3RpdmU6ICgpID0+IEVmZmVjdC5FZmZlY3Q8YW55LCBhbnksIGFueT5cbn1cblxuZXhwb3J0IGludGVyZmFjZSBGbHVlbnRNYXRjaFRhZzxWIGV4dGVuZHMgeyBfdGFnOiBzdHJpbmcgfT4ge1xuICByZWFkb25seSB3aXRoOiA8SyBleHRlbmRzIFZbJ190YWcnXSwgQT4odGFnOiBLLCBoYW5kbGVyOiAodmFsdWU6IEV4dHJhY3Q8ViwgeyBfdGFnOiBLIH0+KSA9PiBBKSA9PiBGbHVlbnRNYXRjaFRhZzxWPlxuICByZWFkb25seSBvdGhlcndpc2U6IDxBPihoYW5kbGVyOiAodmFsdWU6IFYpID0+IEEpID0+IEFcbiAgcmVhZG9ubHkgZXhoYXVzdGl2ZTogKCkgPT4gRWZmZWN0LkVmZmVjdDxhbnksIGFueSwgYW55PlxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvZ2ljTWV0YSB7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZ1xuICByZWFkb25seSBzdG9yZUlkPzogc3RyaW5nXG4gIHJlYWRvbmx5IGFjdGlvbj86IHVua25vd25cbiAgcmVhZG9ubHkgdGFncz86IHN0cmluZ1tdXG4gIHJlYWRvbmx5IFtrZXk6IHN0cmluZ106IHVua25vd25cbn1cblxuZXhwb3J0IHR5cGUgTWlkZGxld2FyZTxTaCBleHRlbmRzIExvZ2l4LkFueU1vZHVsZVNoYXBlLCBSLCBBLCBFPiA9IChcbiAgZWZmZWN0OiBFZmZlY3QuRWZmZWN0PEEsIEUsIEVudjxTaCwgUj4+LFxuICBtZXRhOiBMb2dpY01ldGEsXG4pID0+IEVmZmVjdC5FZmZlY3Q8QSwgRSwgRW52PFNoLCBSPj5cblxuZGVjbGFyZSBjb25zdCBTZWN1cmVkOiB1bmlxdWUgc3ltYm9sXG5cbmV4cG9ydCB0eXBlIFNlY3VyZWQ8U2ggZXh0ZW5kcyBMb2dpeC5BbnlNb2R1bGVTaGFwZSwgUiwgQSwgRT4gPSBFZmZlY3QuRWZmZWN0PEEsIEUsIEVudjxTaCwgUj4+ICYge1xuICByZWFkb25seSBbU2VjdXJlZF06IHRydWVcbn1cblxuZXhwb3J0IGNvbnN0IHNlY3VyZSA9IDxTaCBleHRlbmRzIExvZ2l4LkFueU1vZHVsZVNoYXBlLCBSLCBBLCBFPihcbiAgZWZmZWN0OiBFZmZlY3QuRWZmZWN0PEEsIEUsIEVudjxTaCwgUj4+LFxuICBtZXRhOiBMb2dpY01ldGEsXG4gIC4uLm1pZGRsZXdhcmVzOiBNaWRkbGV3YXJlPFNoLCBSLCBBLCBFPltdXG4pOiBTZWN1cmVkPFNoLCBSLCBBLCBFPiA9PiB7XG4gIGNvbnN0IGNvbXBvc2VkID0gbWlkZGxld2FyZXMucmVkdWNlUmlnaHQoKGFjYywgbXcpID0+IG13KGFjYywgbWV0YSksIGVmZmVjdClcbiAgcmV0dXJuIGNvbXBvc2VkIGFzIFNlY3VyZWQ8U2gsIFIsIEEsIEU+XG59XG4iLCAiaW1wb3J0IHsgRWZmZWN0LCBTdHJlYW0sIFJlZiB9IGZyb20gXCJlZmZlY3RcIlxuaW1wb3J0IHR5cGUge1xuICBBbnlNb2R1bGVTaGFwZSxcbiAgTW9kdWxlUnVudGltZSxcbiAgU3RhdGVPZixcbiAgQWN0aW9uT2YsXG4gIE1vZHVsZVNoYXBlLFxufSBmcm9tIFwiLi9tb2R1bGUuanNcIlxuaW1wb3J0IHR5cGUgKiBhcyBMb2dpYyBmcm9tIFwiLi9Mb2dpY01pZGRsZXdhcmUuanNcIlxuXG5leHBvcnQgaW50ZXJmYWNlIEFwaTxTaCBleHRlbmRzIE1vZHVsZVNoYXBlPGFueSwgYW55PiwgUiA9IG5ldmVyPiB7XG4gIHJlYWRvbmx5IGZyb21BY3Rpb246IDxUIGV4dGVuZHMgQWN0aW9uT2Y8U2g+PihcbiAgICBwcmVkaWNhdGU6IChhOiBBY3Rpb25PZjxTaD4pID0+IGEgaXMgVFxuICApID0+IFN0cmVhbS5TdHJlYW08VD5cblxuICByZWFkb25seSBmcm9tU3RhdGU6IDxWPihcbiAgICBzZWxlY3RvcjogKHM6IFN0YXRlT2Y8U2g+KSA9PiBWXG4gICkgPT4gU3RyZWFtLlN0cmVhbTxWPlxuXG4gIHJlYWRvbmx5IGRlYm91bmNlOiA8Vj4oXG4gICAgbXM6IG51bWJlclxuICApID0+IChzdHJlYW06IFN0cmVhbS5TdHJlYW08Vj4pID0+IFN0cmVhbS5TdHJlYW08Vj5cblxuICByZWFkb25seSB0aHJvdHRsZTogPFY+KFxuICAgIG1zOiBudW1iZXJcbiAgKSA9PiAoc3RyZWFtOiBTdHJlYW0uU3RyZWFtPFY+KSA9PiBTdHJlYW0uU3RyZWFtPFY+XG5cbiAgcmVhZG9ubHkgZmlsdGVyOiA8Vj4oXG4gICAgcHJlZGljYXRlOiAodmFsdWU6IFYpID0+IGJvb2xlYW5cbiAgKSA9PiAoc3RyZWFtOiBTdHJlYW0uU3RyZWFtPFY+KSA9PiBTdHJlYW0uU3RyZWFtPFY+XG5cbiAgcmVhZG9ubHkgcnVuOiA8ViwgQSA9IHZvaWQsIEUgPSBuZXZlciwgUjIgPSB1bmtub3duPihcbiAgICBlZmY6XG4gICAgICB8IExvZ2ljLk9mPFNoLCBSICYgUjIsIEEsIEU+XG4gICAgICB8ICgocGF5bG9hZDogVikgPT4gTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT4pXG4gICkgPT4gKHN0cmVhbTogU3RyZWFtLlN0cmVhbTxWPikgPT4gRWZmZWN0LkVmZmVjdDx2b2lkLCBFLCBMb2dpYy5FbnY8U2gsIFIgJiBSMj4+XG5cbiAgcmVhZG9ubHkgcnVuUGFyYWxsZWw6IDxWLCBBID0gdm9pZCwgRSA9IG5ldmVyLCBSMiA9IHVua25vd24+KFxuICAgIGVmZjpcbiAgICAgIHwgTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT5cbiAgICAgIHwgKChwYXlsb2FkOiBWKSA9PiBMb2dpYy5PZjxTaCwgUiAmIFIyLCBBLCBFPilcbiAgKSA9PiAoc3RyZWFtOiBTdHJlYW0uU3RyZWFtPFY+KSA9PiBFZmZlY3QuRWZmZWN0PHZvaWQsIEUsIExvZ2ljLkVudjxTaCwgUiAmIFIyPj5cblxuICByZWFkb25seSBydW5MYXRlc3Q6IDxWLCBBID0gdm9pZCwgRSA9IG5ldmVyLCBSMiA9IHVua25vd24+KFxuICAgIGVmZjpcbiAgICAgIHwgTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT5cbiAgICAgIHwgKChwYXlsb2FkOiBWKSA9PiBMb2dpYy5PZjxTaCwgUiAmIFIyLCBBLCBFPilcbiAgKSA9PiAoc3RyZWFtOiBTdHJlYW0uU3RyZWFtPFY+KSA9PiBFZmZlY3QuRWZmZWN0PHZvaWQsIEUsIExvZ2ljLkVudjxTaCwgUiAmIFIyPj5cblxuICByZWFkb25seSBydW5FeGhhdXN0OiA8ViwgQSA9IHZvaWQsIEUgPSBuZXZlciwgUjIgPSB1bmtub3duPihcbiAgICBlZmY6XG4gICAgICB8IExvZ2ljLk9mPFNoLCBSICYgUjIsIEEsIEU+XG4gICAgICB8ICgocGF5bG9hZDogVikgPT4gTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT4pXG4gICkgPT4gKHN0cmVhbTogU3RyZWFtLlN0cmVhbTxWPikgPT4gRWZmZWN0LkVmZmVjdDx2b2lkLCBFLCBMb2dpYy5FbnY8U2gsIFIgJiBSMj4+XG59XG5cbmNvbnN0IHJlc29sdmVFZmZlY3QgPSA8VCwgU2ggZXh0ZW5kcyBBbnlNb2R1bGVTaGFwZSwgUiwgQSwgRT4oXG4gIGVmZjpcbiAgICB8IExvZ2ljLk9mPFNoLCBSLCBBLCBFPlxuICAgIHwgKChwYXlsb2FkOiBUKSA9PiBMb2dpYy5PZjxTaCwgUiwgQSwgRT4pLFxuICBwYXlsb2FkOiBUXG4pOiBMb2dpYy5PZjxTaCwgUiwgQSwgRT4gPT5cbiAgdHlwZW9mIGVmZiA9PT0gXCJmdW5jdGlvblwiXG4gICAgPyAoZWZmIGFzIChwOiBUKSA9PiBMb2dpYy5PZjxTaCwgUiwgQSwgRT4pKHBheWxvYWQpXG4gICAgOiBlZmZcblxuZXhwb3J0IGNvbnN0IG1ha2UgPSA8U2ggZXh0ZW5kcyBBbnlNb2R1bGVTaGFwZSwgUiA9IG5ldmVyPihcbiAgcnVudGltZTogTW9kdWxlUnVudGltZTxTdGF0ZU9mPFNoPiwgQWN0aW9uT2Y8U2g+PlxuKTogQXBpPFNoLCBSPiA9PiB7XG4gIGNvbnN0IHJ1bkVmZmVjdCA9XG4gICAgPFQsIEEsIEUsIFIyPihcbiAgICAgIGVmZjpcbiAgICAgICAgfCBMb2dpYy5PZjxTaCwgUiAmIFIyLCBBLCBFPlxuICAgICAgICB8ICgocGF5bG9hZDogVCkgPT4gTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT4pXG4gICAgKSA9PlxuICAgICAgKHBheWxvYWQ6IFQpID0+XG4gICAgICAgIHJlc29sdmVFZmZlY3Q8VCwgU2gsIFIgJiBSMiwgQSwgRT4oZWZmLCBwYXlsb2FkKVxuXG4gIGNvbnN0IHJ1blN0cmVhbVNlcXVlbnRpYWwgPVxuICAgIDxULCBBLCBFLCBSMj4oXG4gICAgICBlZmY6XG4gICAgICAgIHwgTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT5cbiAgICAgICAgfCAoKHBheWxvYWQ6IFQpID0+IExvZ2ljLk9mPFNoLCBSICYgUjIsIEEsIEU+KVxuICAgICkgPT5cbiAgICAoc3RyZWFtOiBTdHJlYW0uU3RyZWFtPFQ+KTogRWZmZWN0LkVmZmVjdDxcbiAgICAgIHZvaWQsXG4gICAgICBFLFxuICAgICAgTG9naWMuRW52PFNoLCBSICYgUjI+XG4gICAgPiA9PiBTdHJlYW0ucnVuRm9yRWFjaChzdHJlYW0sIChwYXlsb2FkKSA9PlxuICAgICAgcnVuRWZmZWN0PFQsIEEsIEUsIFIyPihlZmYpKHBheWxvYWQpLFxuICAgIClcblxuICBjb25zdCBydW5TdHJlYW1QYXJhbGxlbCA9XG4gICAgPFQsIEEsIEUsIFIyPihcbiAgICAgIGVmZjpcbiAgICAgICAgfCBMb2dpYy5PZjxTaCwgUiAmIFIyLCBBLCBFPlxuICAgICAgICB8ICgocGF5bG9hZDogVCkgPT4gTG9naWMuT2Y8U2gsIFIgJiBSMiwgQSwgRT4pXG4gICAgKSA9PlxuICAgIChzdHJlYW06IFN0cmVhbS5TdHJlYW08VD4pOiBFZmZlY3QuRWZmZWN0PFxuICAgICAgdm9pZCxcbiAgICAgIEUsXG4gICAgICBMb2dpYy5FbnY8U2gsIFIgJiBSMj5cbiAgICA+ID0+IFN0cmVhbS5ydW5EcmFpbihcbiAgICAgIHN0cmVhbS5waXBlKFxuICAgICAgICBTdHJlYW0ubWFwRWZmZWN0KFxuICAgICAgICAgIChwYXlsb2FkKSA9PiBydW5FZmZlY3Q8VCwgQSwgRSwgUjI+KGVmZikocGF5bG9hZCksXG4gICAgICAgICAgeyBjb25jdXJyZW5jeTogXCJ1bmJvdW5kZWRcIiB9LFxuICAgICAgICApLFxuICAgICAgKSxcbiAgICApXG5cbiAgcmV0dXJuIHtcbiAgICBmcm9tQWN0aW9uOiA8VCBleHRlbmRzIEFjdGlvbk9mPFNoPj4oXG4gICAgICBwcmVkaWNhdGU6IChhOiBBY3Rpb25PZjxTaD4pID0+IGEgaXMgVFxuICAgICkgPT4gcnVudGltZS5hY3Rpb25zJC5waXBlKFN0cmVhbS5maWx0ZXIocHJlZGljYXRlKSksXG5cbiAgICBmcm9tU3RhdGU6IDxWPihzZWxlY3RvcjogKHM6IFN0YXRlT2Y8U2g+KSA9PiBWKSA9PlxuICAgICAgcnVudGltZS5jaGFuZ2VzKHNlbGVjdG9yKSxcblxuICAgIGRlYm91bmNlOiAobXM6IG51bWJlcikgPT4gKHN0cmVhbSkgPT4gU3RyZWFtLmRlYm91bmNlKHN0cmVhbSwgbXMpLFxuXG4gICAgdGhyb3R0bGU6IChtczogbnVtYmVyKSA9PiAoc3RyZWFtKSA9PlxuICAgICAgU3RyZWFtLnRocm90dGxlKHN0cmVhbSwge1xuICAgICAgICBjb3N0OiAoKSA9PiAxLFxuICAgICAgICB1bml0czogMSxcbiAgICAgICAgZHVyYXRpb246IG1zLFxuICAgICAgICBzdHJhdGVneTogXCJlbmZvcmNlXCIsXG4gICAgICB9KSxcblxuICAgIGZpbHRlcjogKHByZWRpY2F0ZTogKHZhbHVlOiBhbnkpID0+IGJvb2xlYW4pID0+IChzdHJlYW0pID0+XG4gICAgICBTdHJlYW0uZmlsdGVyKHN0cmVhbSwgcHJlZGljYXRlKSxcblxuICAgIHJ1bjogKGVmZikgPT4gKHN0cmVhbSkgPT5cbiAgICAgIHJ1blN0cmVhbVNlcXVlbnRpYWw8YW55LCBhbnksIGFueSwgYW55PihlZmYpKHN0cmVhbSksXG5cbiAgICBydW5QYXJhbGxlbDogKGVmZikgPT4gKHN0cmVhbSkgPT5cbiAgICAgIHJ1blN0cmVhbVBhcmFsbGVsPGFueSwgYW55LCBhbnksIGFueT4oZWZmKShzdHJlYW0pLFxuXG4gICAgcnVuTGF0ZXN0OiAoZWZmKSA9PiAoc3RyZWFtKSA9PlxuICAgICAgU3RyZWFtLnJ1bkRyYWluKFxuICAgICAgICBTdHJlYW0ubWFwKHN0cmVhbSwgKHBheWxvYWQpID0+XG4gICAgICAgICAgcnVuRWZmZWN0PGFueSwgYW55LCBhbnksIGFueT4oZWZmKShwYXlsb2FkKVxuICAgICAgICApLnBpcGUoXG4gICAgICAgICAgU3RyZWFtLmZsYXRNYXAoKGVmZmVjdCkgPT4gU3RyZWFtLmZyb21FZmZlY3QoZWZmZWN0KSwge1xuICAgICAgICAgICAgc3dpdGNoOiB0cnVlLFxuICAgICAgICAgIH0pXG4gICAgICAgIClcbiAgICAgICksXG5cbiAgICBydW5FeGhhdXN0OiAoZWZmKSA9PiAoc3RyZWFtKSA9PlxuICAgICAgRWZmZWN0LmdlbihmdW5jdGlvbiogKCkge1xuICAgICAgICBjb25zdCBidXN5UmVmID0geWllbGQqIFJlZi5tYWtlKGZhbHNlKVxuICAgICAgICBjb25zdCBtYXBwZXIgPSAocGF5bG9hZDogYW55KSA9PlxuICAgICAgICAgIEVmZmVjdC5nZW4oZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjcXVpcmVkID0geWllbGQqIFJlZi5tb2RpZnkoYnVzeVJlZiwgKGJ1c3kpID0+XG4gICAgICAgICAgICAgIGJ1c3kgPyAoW2ZhbHNlLCBidXN5XSBhcyBjb25zdCkgOiAoW3RydWUsIHRydWVdIGFzIGNvbnN0KVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgaWYgKCFhY3F1aXJlZCkge1xuICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHlpZWxkKiBydW5FZmZlY3Q8YW55LCBhbnksIGFueSwgYW55PihlZmYpKHBheWxvYWQpXG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICB5aWVsZCogUmVmLnNldChidXN5UmVmLCBmYWxzZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuXG4gICAgICAgIHJldHVybiB5aWVsZCogU3RyZWFtLnJ1bkRyYWluKFxuICAgICAgICAgIHN0cmVhbS5waXBlKFxuICAgICAgICAgICAgU3RyZWFtLm1hcEVmZmVjdChtYXBwZXIsIHsgY29uY3VycmVuY3k6IFwidW5ib3VuZGVkXCIgfSlcbiAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgIH0pLFxuICB9XG59XG5cbiIsICJpbXBvcnQgeyBFZmZlY3QgfSBmcm9tIFwiZWZmZWN0XCJcblxuZXhwb3J0IGNvbnN0IG1ha2VNYXRjaCA9IDxWPih2YWx1ZTogVikgPT4ge1xuICBsZXQgcmVzdWx0OiBFZmZlY3QuRWZmZWN0PGFueSwgYW55LCBhbnk+IHwgdW5kZWZpbmVkXG5cbiAgY29uc3QgY2hhaW4gPSB7XG4gICAgd2l0aDogPEE+KFxuICAgICAgcHJlZGljYXRlOiAodmFsdWU6IFYpID0+IGJvb2xlYW4sXG4gICAgICBoYW5kbGVyOiAodmFsdWU6IFYpID0+IEFcbiAgICApID0+IHtcbiAgICAgIGlmIChyZXN1bHQpIHJldHVybiBjaGFpblxuICAgICAgaWYgKHByZWRpY2F0ZSh2YWx1ZSkpIHtcbiAgICAgICAgcmVzdWx0ID0gaGFuZGxlcih2YWx1ZSkgYXMgYW55XG4gICAgICB9XG4gICAgICByZXR1cm4gY2hhaW5cbiAgICB9LFxuICAgIG90aGVyd2lzZTogPEE+KGhhbmRsZXI6ICh2YWx1ZTogVikgPT4gQSk6IEEgPT4ge1xuICAgICAgaWYgKHJlc3VsdCkgcmV0dXJuIHJlc3VsdCBhcyBBXG4gICAgICByZXR1cm4gaGFuZGxlcih2YWx1ZSlcbiAgICB9LFxuICAgIGV4aGF1c3RpdmU6ICgpID0+IHtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgfVxuICAgICAgcmV0dXJuIEVmZmVjdC5kaWVNZXNzYWdlKFxuICAgICAgICBcIltGbHVlbnRNYXRjaF0gTm9uLWV4aGF1c3RpdmUgbWF0Y2g6IG5vIHBhdHRlcm4gbWF0Y2hlZCB2YWx1ZVwiXG4gICAgICApXG4gICAgfSxcbiAgfVxuXG4gIHJldHVybiBjaGFpblxufVxuXG5leHBvcnQgY29uc3QgbWFrZU1hdGNoVGFnID0gPFYgZXh0ZW5kcyB7IF90YWc6IHN0cmluZyB9Pih2YWx1ZTogVikgPT4ge1xuICBsZXQgcmVzdWx0OiBFZmZlY3QuRWZmZWN0PGFueSwgYW55LCBhbnk+IHwgdW5kZWZpbmVkXG5cbiAgY29uc3QgY2hhaW4gPSB7XG4gICAgd2l0aDogPEsgZXh0ZW5kcyBWW1wiX3RhZ1wiXSwgQT4oXG4gICAgICB0OiBLLFxuICAgICAgaGFuZGxlcjogKHZhbHVlOiBFeHRyYWN0PFYsIHsgX3RhZzogSyB9PikgPT4gQVxuICAgICkgPT4ge1xuICAgICAgaWYgKHJlc3VsdCkgcmV0dXJuIGNoYWluXG4gICAgICBpZiAodmFsdWUuX3RhZyA9PT0gdCkge1xuICAgICAgICByZXN1bHQgPSBoYW5kbGVyKHZhbHVlIGFzIEV4dHJhY3Q8ViwgeyBfdGFnOiBLIH0+KSBhcyBhbnlcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGFpblxuICAgIH0sXG4gICAgb3RoZXJ3aXNlOiA8QT4oaGFuZGxlcjogKHZhbHVlOiBWKSA9PiBBKTogQSA9PiB7XG4gICAgICBpZiAocmVzdWx0KSByZXR1cm4gcmVzdWx0IGFzIEFcbiAgICAgIHJldHVybiBoYW5kbGVyKHZhbHVlKVxuICAgIH0sXG4gICAgZXhoYXVzdGl2ZTogKCkgPT4ge1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICB9XG4gICAgICByZXR1cm4gRWZmZWN0LmRpZU1lc3NhZ2UoXG4gICAgICAgIFwiW0ZsdWVudE1hdGNoVGFnXSBOb24tZXhoYXVzdGl2ZSBtYXRjaDogbm8gdGFnIGhhbmRsZXIgbWF0Y2hlZCB2YWx1ZVwiXG4gICAgICApXG4gICAgfSxcbiAgfVxuXG4gIHJldHVybiBjaGFpblxufVxuIiwgImltcG9ydCB7IENvbnRleHQsIEVmZmVjdCB9IGZyb20gXCJlZmZlY3RcIlxuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZpY2Uge1xuICByZWFkb25seSBsaWZlY3ljbGU6IHtcbiAgICByZWFkb25seSBvblN1c3BlbmQ6IChcbiAgICAgIGVmZjogRWZmZWN0LkVmZmVjdDx2b2lkLCBuZXZlciwgYW55PlxuICAgICkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkLCBuZXZlciwgYW55PlxuICAgIHJlYWRvbmx5IG9uUmVzdW1lOiAoXG4gICAgICBlZmY6IEVmZmVjdC5FZmZlY3Q8dm9pZCwgbmV2ZXIsIGFueT5cbiAgICApID0+IEVmZmVjdC5FZmZlY3Q8dm9pZCwgbmV2ZXIsIGFueT5cbiAgICByZWFkb25seSBvblJlc2V0PzogKFxuICAgICAgZWZmOiBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+XG4gICAgKSA9PiBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IFRhZyA9IENvbnRleHQuR2VuZXJpY1RhZzxTZXJ2aWNlPihcIkBsb2dpeC9QbGF0Zm9ybVwiKVxuXG4iLCAiaW1wb3J0IHR5cGUgeyBDb250ZXh0LCBMYXllciBhcyBFZmZlY3RMYXllciB9IGZyb20gXCJlZmZlY3RcIlxuXG4vKipcbiAqIFN0YXRlIFx1NTQ3RFx1NTQwRFx1N0E3QVx1OTVGNFx1RkYwOFx1NkEyMVx1NTc1N1x1NzI0OFx1RkYwOVx1RkYxQVxuICogLSBcdTYzRDBcdTRGOUIgU3RhdGUuVGFnPFM+XHVGRjFBXHU3NTI4XHU0RThFXHU1NzI4IEVudiBcdTRFMkRcdTY4MDdcdThCQjBcdTY3RDBcdTdDN0IgU3RhdGVcdUZGMUJcbiAqIC0gXHU2M0QwXHU0RjlCIFN0YXRlLkxheWVyPFM+XHVGRjFBXHU3NTI4XHU0RThFXHU2Nzg0XHU5MDIwXHU1M0VBXHU2NDNBXHU1RTI2IFN0YXRlLlRhZzxTPiBcdTc2ODQgTGF5ZXJcdTMwMDJcbiAqXG4gKiBcdTRFQzVcdTU3MjhcdTdDN0JcdTU3OEJcdTVDNDJcdTk3NjJcdTRGN0ZcdTc1MjhcdUZGMENcdTRFMERcdTVGMTVcdTUxNjVcdTk4OURcdTU5MTZcdThGRDBcdTg4NENcdTY1RjZcdTRGOURcdThENTZcdTMwMDJcbiAqL1xuZXhwb3J0IHR5cGUgVGFnPFM+ID0gQ29udGV4dC5UYWc8YW55LCBTPlxuZXhwb3J0IHR5cGUgTGF5ZXI8Uz4gPSBFZmZlY3RMYXllci5MYXllcjxUYWc8Uz4sIG5ldmVyLCBuZXZlcj5cbiIsICJpbXBvcnQgdHlwZSB7IENvbnRleHQsIExheWVyIGFzIEVmZmVjdExheWVyLCBTdHJlYW0sIEVmZmVjdCB9IGZyb20gXCJlZmZlY3RcIlxuXG4vKipcbiAqIEFjdGlvbnMgXHU1NDdEXHU1NDBEXHU3QTdBXHU5NUY0XHVGRjA4XHU2QTIxXHU1NzU3XHU3MjQ4XHVGRjA5XHVGRjFBXG4gKiAtIFx1NjNEMFx1NEY5QiBBY3Rpb25zLlRhZzxBPlx1RkYxQUVudiBcdTRFMkRcdTc2ODQgQWN0aW9uIFx1OTAxQVx1OTA1M1x1RkYwOGRpc3BhdGNoICsgYWN0aW9ucyRcdUZGMDlcdUZGMUJcbiAqIC0gXHU2M0QwXHU0RjlCIEFjdGlvbnMuTGF5ZXI8QT5cdUZGMUFcdTUzRUFcdTY0M0FcdTVFMjZcdThCRTUgQWN0aW9uIFx1OTAxQVx1OTA1M1x1NzY4NCBMYXllciBcdTVGNjJcdTcyQjZcdTMwMDJcbiAqXG4gKiBcdTRFQzVcdTU3MjhcdTdDN0JcdTU3OEJcdTVDNDJcdTk3NjJcdTRGN0ZcdTc1MjhcdUZGMENcdTRFMERcdTVGMTVcdTUxNjVcdTk4OURcdTU5MTZcdThGRDBcdTg4NENcdTY1RjZcdTRGOURcdThENTZcdTMwMDJcbiAqL1xuZXhwb3J0IHR5cGUgVGFnPEE+ID0gQ29udGV4dC5UYWc8XG4gIGFueSxcbiAge1xuICAgIGRpc3BhdGNoOiAoYTogQSkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkPlxuICAgIGFjdGlvbnMkOiBTdHJlYW0uU3RyZWFtPEE+XG4gIH1cbj5cblxuZXhwb3J0IHR5cGUgTGF5ZXI8QT4gPSBFZmZlY3RMYXllci5MYXllcjxUYWc8QT4sIG5ldmVyLCBuZXZlcj5cbiIsICJpbXBvcnQgeyBDb250ZXh0LCBFZmZlY3QgfSBmcm9tIFwiZWZmZWN0XCJcbmltcG9ydCB0eXBlICogYXMgTG9naXggZnJvbSBcIi4vaW50ZXJuYWwvbW9kdWxlLmpzXCJcbmltcG9ydCAqIGFzIEludGVybmFsIGZyb20gXCIuL2ludGVybmFsL0xvZ2ljTWlkZGxld2FyZS5qc1wiXG5pbXBvcnQgKiBhcyBQbGF0Zm9ybUludGVybmFsIGZyb20gXCIuL2ludGVybmFsL3BsYXRmb3JtL1BsYXRmb3JtLmpzXCJcblxuZXhwb3J0ICogZnJvbSBcIi4vaW50ZXJuYWwvTG9naWNNaWRkbGV3YXJlLmpzXCJcblxuLy8gTG9naWNcdUZGMUFcdTU3MjhcdTY3RDBcdTRFMDBcdTdDN0IgTW9kdWxlIFx1NEUwQVx1OTU3Rlx1NjcxRlx1OEZEMFx1ODg0Q1x1NzY4NFx1NEUwMFx1NkJCNSBFZmZlY3QgXHU3QTBCXHU1RThGXHUzMDAyXG5cbi8qKlxuICogTG9naWMgXHU0RjVDXHU3NTI4XHU1N0RGXHU1MTg1XHU3NTI4XHU0RThFXHU4M0I3XHU1M0Q2XHU1RjUzXHU1MjREIE1vZHVsZVJ1bnRpbWUgXHU3Njg0XHU2ODM4XHU1RkMzIFRhZ1x1MzAwMlxuICovXG5leHBvcnQgY29uc3QgUnVudGltZVRhZzogQ29udGV4dC5UYWc8YW55LCBMb2dpeC5Nb2R1bGVSdW50aW1lPGFueSwgYW55Pj4gPVxuICBDb250ZXh0LkdlbmVyaWNUYWc8YW55LCBMb2dpeC5Nb2R1bGVSdW50aW1lPGFueSwgYW55Pj4oXCJAbG9naXgvUnVudGltZVwiKVxuXG4vLyBcdTVCRjlcdTU5MTZcdTY2QjRcdTk3MzJcdTc2ODQgUGxhdGZvcm0gXHU3QzdCXHU1NzhCXHU1MjJCXHU1NDBEXHVGRjA4XHU0RTBFIGludGVybmFsL3BsYXRmb3JtL1BsYXRmb3JtLlNlcnZpY2UgXHU3QjQ5XHU0RUY3XHVGRjA5XHUzMDAyXG5leHBvcnQgdHlwZSBQbGF0Zm9ybSA9IFBsYXRmb3JtSW50ZXJuYWwuU2VydmljZVxuXG4vLyBMb2dpYyBFbnYgLyBPZiBcdTdDN0JcdTU3OEJcdTUyMkJcdTU0MERcdUZGMUFcdTdFREZcdTRFMDBcdTYzMDdcdTU0MTEgaW50ZXJuYWwgXHU3MjQ4XHU2NzJDXHVGRjBDXHU5MDdGXHU1MTREXHU1OTFBXHU1OTA0XHU1QjlBXHU0RTQ5XHUzMDAyXG5leHBvcnQgdHlwZSBFbnY8U2ggZXh0ZW5kcyBMb2dpeC5BbnlNb2R1bGVTaGFwZSwgUj4gPSBJbnRlcm5hbC5FbnY8U2gsIFI+XG5cbmV4cG9ydCB0eXBlIE9mPFxuICBTaCBleHRlbmRzIExvZ2l4LkFueU1vZHVsZVNoYXBlLFxuICBSID0gbmV2ZXIsXG4gIEEgPSB2b2lkLFxuICBFID0gbmV2ZXJcbj4gPSBJbnRlcm5hbC5PZjxTaCwgUiwgQSwgRT5cblxuZXhwb3J0IGZ1bmN0aW9uIG9mPFxuICBTaCBleHRlbmRzIExvZ2l4LkFueU1vZHVsZVNoYXBlLFxuICBSID0gbmV2ZXIsXG4gIEEgPSB2b2lkLFxuICBFID0gbmV2ZXJcbj4oZWZmOiBFZmZlY3QuRWZmZWN0PEEsIEUsIEVudjxTaCwgUj4+KTogT2Y8U2gsIFIsIEEsIEU+IHtcbiAgcmV0dXJuIGVmZiBhcyBPZjxTaCwgUiwgQSwgRT5cbn1cblxuLy8gRFNMIFx1N0M3Qlx1NTc4Qlx1NTIyQlx1NTQwRFx1RkYxQVx1NzZGNFx1NjNBNVx1NTkwRFx1NzUyOCBpbnRlcm5hbCBcdTVCOUFcdTRFNDlcdTMwMDJcbmV4cG9ydCB0eXBlIERyYWZ0PFQ+ID0gSW50ZXJuYWwuRHJhZnQ8VD5cbmV4cG9ydCB0eXBlIEFuZFRoZW5VcGRhdGVIYW5kbGVyPFxuICBTaCBleHRlbmRzIExvZ2l4LkFueU1vZHVsZVNoYXBlLFxuICBQYXlsb2FkLFxuICBFID0gYW55LFxuICBSMiA9IGFueVxuPiA9IEludGVybmFsLkFuZFRoZW5VcGRhdGVIYW5kbGVyPFNoLCBQYXlsb2FkLCBFLCBSMj5cbmV4cG9ydCB0eXBlIEludGVudEJ1aWxkZXI8XG4gIFBheWxvYWQsXG4gIFNoIGV4dGVuZHMgTG9naXguQW55TW9kdWxlU2hhcGUsXG4gIFIgPSBuZXZlclxuPiA9IEludGVybmFsLkludGVudEJ1aWxkZXI8UGF5bG9hZCwgU2gsIFI+XG5leHBvcnQgdHlwZSBGbHVlbnRNYXRjaDxWPiA9IEludGVybmFsLkZsdWVudE1hdGNoPFY+XG5leHBvcnQgdHlwZSBGbHVlbnRNYXRjaFRhZzxWIGV4dGVuZHMgeyBfdGFnOiBzdHJpbmcgfT4gPVxuICBJbnRlcm5hbC5GbHVlbnRNYXRjaFRhZzxWPlxuXG4vLyBcdTUxNzZcdTRGNTlcdTVCOUVcdTczQjBcdTdFQzZcdTgyODJcdUZGMDhJbnRlbnRCdWlsZGVyIFx1NURFNVx1NTM4Mlx1N0I0OVx1RkYwOVx1NzUzMSBpbnRlcm5hbC9ydW50aW1lIFx1N0VDNFx1NTQwOFx1NUI4Q1x1NjIxMFx1RkYwQ1xuLy8gXHU0RTFBXHU1MkExXHU0RUUzXHU3ODAxXHU0RTAwXHU4MjJDXHU1M0VBXHU5MDFBXHU4RkM3IE1vZHVsZS5sb2dpYyBcdTRFMEUgQm91bmQgQVBJIFx1NEY3Rlx1NzUyOFx1NjcyQ1x1NkEyMVx1NTc1N1x1RkYwQ1x1NEUwRFx1NzZGNFx1NjNBNVx1NEY5RFx1OEQ1Nlx1NTE4NVx1OTBFOFx1Njc4NFx1OTAyMFx1OEZDN1x1N0EwQlx1MzAwMlxuIiwgImltcG9ydCB7IENvbnRleHQsIEVmZmVjdCwgU2NoZW1hLCBTdHJlYW0sIFN1YnNjcmlwdGlvblJlZiB9IGZyb20gXCJlZmZlY3RcIlxuaW1wb3J0IHR5cGUgKiBhcyBMb2dpeCBmcm9tIFwiLi9pbnRlcm5hbC9tb2R1bGUuanNcIlxuaW1wb3J0IHR5cGUgKiBhcyBGbG93IGZyb20gXCIuL0Zsb3cuanNcIlxuaW1wb3J0ICogYXMgTG9naWMgZnJvbSBcIi4vTG9naWMuanNcIlxuaW1wb3J0ICogYXMgQm91bmRBcGlSdW50aW1lIGZyb20gXCIuL2ludGVybmFsL3J1bnRpbWUvQm91bmRBcGlSdW50aW1lLmpzXCJcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBCb3VuZEFwaVx1RkYxQVx1NEUzQVx1NjdEMFx1NEUwMFx1N0M3QiBTdG9yZSBTaGFwZSArIEVudiBcdTUyMUJcdTVFRkFcdTk4ODRcdTdFRDFcdTVCOUFcdTc2ODRcdThCQkZcdTk1RUVcdTU2Njhcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKipcbiAqIEFjdGlvbiBBUElcdUZGMUFcdTU2RkFcdTVCOUFcdTY1QjlcdTZDRDUgKyBcdTUyQThcdTYwMDEgQWN0aW9uIERpc3BhdGNoZXJcdTMwMDJcbiAqL1xuZXhwb3J0IHR5cGUgQWN0aW9uc0FwaTxTaCBleHRlbmRzIExvZ2l4LkFueU1vZHVsZVNoYXBlLCBSPiA9IHtcbiAgcmVhZG9ubHkgZGlzcGF0Y2g6IChcbiAgICBhY3Rpb246IExvZ2l4LkFjdGlvbk9mPFNoPlxuICApID0+IExvZ2ljLlNlY3VyZWQ8U2gsIFIsIHZvaWQsIG5ldmVyPlxuICByZWFkb25seSBhY3Rpb25zJDogU3RyZWFtLlN0cmVhbTxMb2dpeC5BY3Rpb25PZjxTaD4+XG59ICYge1xuICByZWFkb25seSBbSyBpbiBrZXlvZiBTaFtcImFjdGlvbk1hcFwiXV06IChcbiAgICBwYXlsb2FkOiBTY2hlbWEuU2NoZW1hLlR5cGU8U2hbXCJhY3Rpb25NYXBcIl1bS10+XG4gICkgPT4gTG9naWMuU2VjdXJlZDxTaCwgUiwgdm9pZCwgbmV2ZXI+XG59XG5cbi8qKlxuICogUmVtb3RlQm91bmRBcGlcdUZGMUFcdTU3MjhcdTVGNTNcdTUyNEQgTG9naWMgXHU0RTJEXHU0RUU1IEJvdW5kIFx1OThDRVx1NjgzQ1x1OEJCRlx1OTVFRVx1MzAwQ1x1NTE3Nlx1NEVENiBNb2R1bGVcdTMwMERcdTc2ODRcdTUzRUFcdThCRkJcdTUzRTVcdTY3QzRcdTMwMDJcbiAqXG4gKiAtIFx1NEUwRVx1NjcyQ1x1NkEyMVx1NTc1N1x1NzY4NCBgJGAgXHU1NzI4XHU1MTk5XHU2Q0Q1XHU0RTBBXHU1QzNEXHU5MUNGXHU0RkREXHU2MzAxXHU0RTAwXHU4MUY0XHVGRjA4b25TdGF0ZSAvIG9uQWN0aW9uIC8gb24gLyBhY3Rpb25zXHVGRjA5XHVGRjFCXG4gKiAtIFx1NTNFQVx1NjZCNFx1OTczMlx1MzAwQ1x1OEJGQlx1NTNENiArIFx1NzZEMVx1NTQyQyArIFx1OTAxQVx1OEZDNyBBY3Rpb24gXHU4OUU2XHU1M0QxXHU2NTM5XHU1M0Q4XHUzMDBEXHU3Njg0XHU4MEZEXHU1MjlCXHVGRjBDXHU0RTBEXHU2M0QwXHU0RjlCXHU4REU4XHU2QTIxXHU1NzU3XHU3NkY0XHU2M0E1XHU1MTk5IFN0YXRlIFx1NzY4NFx1NTE2NVx1NTNFM1x1MzAwMlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlbW90ZUJvdW5kQXBpPFxuICBTZWxmU2ggZXh0ZW5kcyBMb2dpeC5BbnlNb2R1bGVTaGFwZSxcbiAgVGFyZ2V0U2ggZXh0ZW5kcyBMb2dpeC5BbnlNb2R1bGVTaGFwZSxcbiAgUiA9IG5ldmVyXG4+IHtcbiAgcmVhZG9ubHkgb25TdGF0ZTogPFY+KFxuICAgIHNlbGVjdG9yOiAoczogTG9naXguU3RhdGVPZjxUYXJnZXRTaD4pID0+IFZcbiAgKSA9PiBMb2dpYy5JbnRlbnRCdWlsZGVyPFYsIFNlbGZTaCwgUj5cblxuICByZWFkb25seSBvbkFjdGlvbjoge1xuICAgIC8vIDEuIFx1N0M3Qlx1NTc4Qlx1NUI4OFx1NTM2Qlx1OEMxM1x1OEJDRFxuICAgIDxUIGV4dGVuZHMgTG9naXguQWN0aW9uT2Y8VGFyZ2V0U2g+PihcbiAgICAgIHByZWRpY2F0ZTogKGE6IExvZ2l4LkFjdGlvbk9mPFRhcmdldFNoPikgPT4gYSBpcyBUXG4gICAgKTogTG9naWMuSW50ZW50QnVpbGRlcjxULCBTZWxmU2gsIFI+XG5cbiAgICAvLyAyLiBcdTkwMUFcdThGQzcgX3RhZyAvIHR5cGUgXHU1QjU3XHU5NzYyXHU5MUNGXHU1MzM5XHU5MTREXHU2N0QwXHU0RTAwXHU1M0Q4XHU0RjUzXG4gICAgPFxuICAgICAgSyBleHRlbmRzIExvZ2l4LkFjdGlvbk9mPFRhcmdldFNoPiBleHRlbmRzIHsgX3RhZzogc3RyaW5nIH1cbiAgICAgICAgPyBMb2dpeC5BY3Rpb25PZjxUYXJnZXRTaD5bXCJfdGFnXCJdXG4gICAgICAgIDogbmV2ZXJcbiAgICA+KFxuICAgICAgdGFnOiBLXG4gICAgKTogTG9naWMuSW50ZW50QnVpbGRlcjxcbiAgICAgIEV4dHJhY3Q8TG9naXguQWN0aW9uT2Y8VGFyZ2V0U2g+LCB7IF90YWc6IEsgfSB8IHsgdHlwZTogSyB9PixcbiAgICAgIFNlbGZTaCxcbiAgICAgIFJcbiAgICA+XG5cbiAgICAvLyAzLiBcdTkwMUFcdThGQzdcdTUxNzdcdTRGNTMgQWN0aW9uIFx1NTAzQ1x1OEZEQlx1ODg0Q1x1N0YyOVx1NUMwRlxuICAgIDxcbiAgICAgIEEgZXh0ZW5kcyBMb2dpeC5BY3Rpb25PZjxUYXJnZXRTaD4gJlxuICAgICAgICAoeyBfdGFnOiBzdHJpbmcgfSB8IHsgdHlwZTogc3RyaW5nIH0pXG4gICAgPihcbiAgICAgIHZhbHVlOiBBXG4gICAgKTogTG9naWMuSW50ZW50QnVpbGRlcjxBLCBTZWxmU2gsIFI+XG5cbiAgICAvLyA0LiBcdTkwMUFcdThGQzcgU2NoZW1hXHVGRjA4XHU1MzU1XHU0RTAwXHU1M0Q4XHU0RjUzIFNjaGVtYVx1RkYwOVx1OEZEQlx1ODg0Q1x1N0YyOVx1NUMwRlxuICAgIDxTYyBleHRlbmRzIExvZ2l4LkFueVNjaGVtYT4oXG4gICAgICBzY2hlbWE6IFNjXG4gICAgKTogTG9naWMuSW50ZW50QnVpbGRlcjxcbiAgICAgIEV4dHJhY3Q8TG9naXguQWN0aW9uT2Y8VGFyZ2V0U2g+LCBTY2hlbWEuU2NoZW1hLlR5cGU8U2M+PixcbiAgICAgIFNlbGZTaCxcbiAgICAgIFJcbiAgICA+XG4gIH0gJiB7XG4gICAgW0sgaW4ga2V5b2YgVGFyZ2V0U2hbXCJhY3Rpb25NYXBcIl1dOiBMb2dpYy5JbnRlbnRCdWlsZGVyPFxuICAgICAgRXh0cmFjdDxMb2dpeC5BY3Rpb25PZjxUYXJnZXRTaD4sIHsgX3RhZzogSyB9IHwgeyB0eXBlOiBLIH0+LFxuICAgICAgU2VsZlNoLFxuICAgICAgUlxuICAgID5cbiAgfVxuXG4gIHJlYWRvbmx5IG9uOiA8Vj4oXG4gICAgc291cmNlOiBTdHJlYW0uU3RyZWFtPFY+XG4gICkgPT4gTG9naWMuSW50ZW50QnVpbGRlcjxWLCBTZWxmU2gsIFI+XG5cbiAgLyoqXG4gICAqIFx1NTdGQVx1NEU4RSBzZWxlY3RvciBcdThCRkJcdTUzRDZcdTc2RUVcdTY4MDdcdTZBMjFcdTU3NTdcdTc2ODRcdTVGRUJcdTcxNjdcdTMwMDJcbiAgICogXHU4QkY0XHU2NjBFXHVGRjFBXHU0RkREXHU2MzAxXHU1M0VBXHU4QkZCXHVGRjBDXHU0RTBEXHU2NkI0XHU5NzMyXHU4REU4XHU2QTIxXHU1NzU3XHU1MTk5IFN0YXRlIFx1NzY4NFx1NjNBNVx1NTNFM1x1MzAwMlxuICAgKi9cbiAgcmVhZG9ubHkgcmVhZDogPFY+KFxuICAgIHNlbGVjdG9yOiAoczogTG9naXguU3RhdGVPZjxUYXJnZXRTaD4pID0+IFZcbiAgKSA9PiBFZmZlY3QuRWZmZWN0PFYsIG5ldmVyLCBMb2dpeC5Nb2R1bGVUYWc8VGFyZ2V0U2g+PlxuXG4gIC8qKlxuICAgKiBcdTkwMUFcdThGQzdcdTc2RUVcdTY4MDdcdTZBMjFcdTU3NTdcdTc2ODQgQWN0aW9uIFx1OEZEQlx1ODg0Q1x1NEVBNFx1NEU5Mlx1MzAwMlxuICAgKiAtIFx1NTNFQVx1NjZCNFx1OTczMiBhY3Rpb25zIC8gYWN0aW9ucyRcdUZGMENcdTRFMERcdTY2QjRcdTk3MzIgc3RhdGUudXBkYXRlL211dGF0ZVx1MzAwMlxuICAgKiAtIFx1OEMwM1x1NzUyOFx1NjVCOVx1NEVDRFx1NzEzNlx1NTcyOFx1NUY1M1x1NTI0RFx1NkEyMVx1NTc1N1x1NzY4NCBMb2dpYyBFbnYgXHU0RTJEXHU4RkQwXHU4ODRDXHUzMDAyXG4gICAqL1xuICByZWFkb25seSBhY3Rpb25zOiBMb2dpeC5Nb2R1bGVIYW5kbGU8VGFyZ2V0U2g+W1wiYWN0aW9uc1wiXVxuICByZWFkb25seSBhY3Rpb25zJDogTG9naXguTW9kdWxlSGFuZGxlPFRhcmdldFNoPltcImFjdGlvbnMkXCJdXG59XG5cbi8qKlxuICogQm91bmQgQVBJIFx1NURFNVx1NTM4Mlx1RkYxQVx1NEUzQVx1NjdEMFx1NEUwMFx1N0M3QiBTdG9yZSBTaGFwZSArIEVudiBcdTUyMUJcdTVFRkFcdTk4ODRcdTdFRDFcdTVCOUFcdTc2ODRcdThCQkZcdTk1RUVcdTU2NjhcdTMwMDJcbiAqXG4gKiAtIFx1OUVEOFx1OEJBNFx1NTdGQVx1NEU4RSBMb2dpYy5SdW50aW1lVGFnIFx1ODNCN1x1NTNENlx1NUY1M1x1NTI0RCBMb2dpeC5Nb2R1bGVSdW50aW1lXHVGRjFCXG4gKiAtIFx1NTNFRlx1OTAwOVx1NEYyMFx1NTE2NSBMb2dpeC5Nb2R1bGVUYWc8U2g+IFx1NEVFNVx1NjYzRVx1NUYwRlx1NjMwN1x1NUI5QSBSdW50aW1lIFx1Njc2NVx1NkU5MFx1RkYwOFx1NEY4Qlx1NTk4Mlx1OERFOCBTdG9yZSBcdTUzNEZcdTRGNUNcdTU3M0FcdTY2NkZcdUZGMDlcdTMwMDJcbiAqXG4gKiBcdThCRjRcdTY2MEVcdUZGMUFcdTY3MkNcdTUxRkRcdTY1NzBcdTRFQzVcdTYzRDBcdTRGOUJcdTdDN0JcdTU3OEJcdTdCN0VcdTU0MERcdUZGMENcdTUxNzdcdTRGNTNcdTVCOUVcdTczQjBcdTc1MzFcdThGRDBcdTg4NENcdTY1RjZcdTRFRTNcdTc4MDFcdTZDRThcdTUxNjVcdUZGMENcdTY3MkMgUG9DIFx1NEUyRFx1OEZENFx1NTZERVx1NTAzQ1x1NEUzQVx1NTM2MFx1NEY0RFx1MzAwMlxuICovXG5leHBvcnQgdHlwZSBCb3VuZEFwaTxTaCBleHRlbmRzIExvZ2l4LkFueU1vZHVsZVNoYXBlLCBSID0gbmV2ZXI+ID1cbiAgTG9naXguQm91bmRBcGk8U2gsIFI+XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm91bmRBcGlQdWJsaWM8U2ggZXh0ZW5kcyBMb2dpeC5BbnlNb2R1bGVTaGFwZSwgUiA9IG5ldmVyPiB7XG4gIHJlYWRvbmx5IHN0YXRlOiB7XG4gICAgcmVhZG9ubHkgcmVhZDogTG9naWMuT2Y8U2gsIFIsIExvZ2l4LlN0YXRlT2Y8U2g+LCBuZXZlcj5cbiAgICByZWFkb25seSB1cGRhdGU6IChcbiAgICAgIGY6IChwcmV2OiBMb2dpeC5TdGF0ZU9mPFNoPikgPT4gTG9naXguU3RhdGVPZjxTaD5cbiAgICApID0+IExvZ2ljLlNlY3VyZWQ8U2gsIFIsIHZvaWQsIG5ldmVyPlxuICAgIHJlYWRvbmx5IG11dGF0ZTogKFxuICAgICAgZjogKGRyYWZ0OiBMb2dpYy5EcmFmdDxMb2dpeC5TdGF0ZU9mPFNoPj4pID0+IHZvaWRcbiAgICApID0+IExvZ2ljLlNlY3VyZWQ8U2gsIFIsIHZvaWQsIG5ldmVyPlxuICAgIHJlYWRvbmx5IHJlZjoge1xuICAgICAgPFYgPSBMb2dpeC5TdGF0ZU9mPFNoPj4oXG4gICAgICAgIHNlbGVjdG9yPzogKHM6IExvZ2l4LlN0YXRlT2Y8U2g+KSA9PiBWXG4gICAgICApOiBTdWJzY3JpcHRpb25SZWYuU3Vic2NyaXB0aW9uUmVmPFY+XG4gICAgfVxuICB9XG4gIHJlYWRvbmx5IGFjdGlvbnM6IEFjdGlvbnNBcGk8U2gsIFI+XG4gIHJlYWRvbmx5IGZsb3c6IEZsb3cuQXBpPFNoLCBSPlxuICByZWFkb25seSBtYXRjaDogPFY+KHZhbHVlOiBWKSA9PiBMb2dpYy5GbHVlbnRNYXRjaDxWPlxuICByZWFkb25seSBtYXRjaFRhZzogPFYgZXh0ZW5kcyB7IF90YWc6IHN0cmluZyB9PihcbiAgICB2YWx1ZTogVlxuICApID0+IExvZ2ljLkZsdWVudE1hdGNoVGFnPFY+XG4gIC8qKlxuICAgKiBcdTc1MUZcdTU0N0RcdTU0NjhcdTY3MUZcdTk0QTlcdTVCNTBcdUZGMUFcdTY2RkZcdTRFRTMgU3RvcmVDb25maWcubGlmZWN5Y2xlXHVGRjBDXHU1NzI4IExvZ2ljIFx1NEUyRFx1NUI5QVx1NEU0OVx1NTIxRFx1NTlDQlx1NTMxNlx1NEUwRVx1OTUwMFx1NkJDMVx1OTAzQlx1OEY5MVx1MzAwMlxuICAgKiBcdTdFQTZcdTY3NUZcdUZGMUFcdTVGQzVcdTk4N0JcdTU5MDRcdTc0MDZcdTYyNDBcdTY3MDlcdTk1MTlcdThCRUYgKEU9bmV2ZXIpXHUzMDAyXG4gICAqL1xuICByZWFkb25seSBsaWZlY3ljbGU6IHtcbiAgICByZWFkb25seSBvbkluaXQ6IChcbiAgICAgIGVmZjogTG9naWMuT2Y8U2gsIFIsIHZvaWQsIG5ldmVyPlxuICAgICkgPT4gTG9naWMuT2Y8U2gsIFIsIHZvaWQsIG5ldmVyPlxuICAgIHJlYWRvbmx5IG9uRGVzdHJveTogKFxuICAgICAgZWZmOiBMb2dpYy5PZjxTaCwgUiwgdm9pZCwgbmV2ZXI+XG4gICAgKSA9PiBMb2dpYy5PZjxTaCwgUiwgdm9pZCwgbmV2ZXI+XG4gICAgLyoqXG4gICAgICogXHU5NTE5XHU4QkVGXHU0RTBBXHU2MkE1XHU5NEE5XHU1QjUwXHVGRjFBXHU1RjUzIExvZ2ljIEZpYmVyIFx1NTNEMVx1NzUxRlx1NjcyQVx1NjM1NVx1ODNCNyBEZWZlY3QgXHU2NUY2XHU4OUU2XHU1M0QxXHUzMDAyXG4gICAgICogXHU0RUM1XHU3NTI4XHU0RThFXHU0RTBBXHU2MkE1XHVGRjBDXHU2NUUwXHU2Q0Q1XHU5NjNCXHU2QjYyIFNjb3BlIFx1NTE3M1x1OTVFRFx1MzAwMlxuICAgICAqL1xuICAgIHJlYWRvbmx5IG9uRXJyb3I6IChcbiAgICAgIGhhbmRsZXI6IChcbiAgICAgICAgY2F1c2U6IGltcG9ydChcImVmZmVjdFwiKS5DYXVzZS5DYXVzZTx1bmtub3duPixcbiAgICAgICAgY29udGV4dDogaW1wb3J0KFwiLi9pbnRlcm5hbC9ydW50aW1lL0xpZmVjeWNsZS5qc1wiKS5FcnJvckNvbnRleHRcbiAgICAgICkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkLCBuZXZlciwgUj5cbiAgICApID0+IExvZ2ljLk9mPFNoLCBSLCB2b2lkLCBuZXZlcj5cblxuICAgIC8vIC0tLSBQbGF0Zm9ybSBIb29rcyAoUHJveGllZCB0byBQbGF0Zm9ybSBTZXJ2aWNlKSAtLS1cblxuICAgIC8qKlxuICAgICAqIFx1NjMwMlx1OEQ3N1x1RkYxQVx1NUY1MyBBcHAvXHU3RUM0XHU0RUY2IFx1OEZEQlx1NTE2NVx1NTQwRVx1NTNGMFx1NjIxNlx1NEUwRFx1NTNFRlx1ODlDMVx1NjVGNlx1ODlFNlx1NTNEMVx1MzAwMlxuICAgICAqIChSZXF1aXJlcyBQbGF0Zm9ybSBMYXllcilcbiAgICAgKi9cbiAgICByZWFkb25seSBvblN1c3BlbmQ6IChcbiAgICAgIGVmZjogTG9naWMuT2Y8U2gsIFIsIHZvaWQsIG5ldmVyPlxuICAgICkgPT4gTG9naWMuT2Y8U2gsIFIsIHZvaWQsIG5ldmVyPlxuXG4gICAgLyoqXG4gICAgICogXHU2MDYyXHU1OTBEXHVGRjFBXHU1RjUzIEFwcC9cdTdFQzRcdTRFRjYgXHU2MDYyXHU1OTBEXHU1MjREXHU1M0YwXHU2MjE2XHU1M0VGXHU4OUMxXHU2NUY2XHU4OUU2XHU1M0QxXHUzMDAyXG4gICAgICogKFJlcXVpcmVzIFBsYXRmb3JtIExheWVyKVxuICAgICAqL1xuICAgIHJlYWRvbmx5IG9uUmVzdW1lOiAoXG4gICAgICBlZmY6IExvZ2ljLk9mPFNoLCBSLCB2b2lkLCBuZXZlcj5cbiAgICApID0+IExvZ2ljLk9mPFNoLCBSLCB2b2lkLCBuZXZlcj5cblxuICAgIC8qKlxuICAgICAqIFx1NEUxQVx1NTJBMVx1OTFDRFx1N0Y2RVx1RkYxQVx1NjgwN1x1NTFDNlx1NTMxNlx1MjAxQ1x1OEY2Rlx1OTFDRFx1N0Y2RVx1MjAxRFx1NEZFMVx1NTNGN1x1RkYwOFx1NTk4MiBMb2dvdXQgLyBDbGVhciBGb3JtXHVGRjA5XHUzMDAyXG4gICAgICogKFJlcXVpcmVzIFBsYXRmb3JtIExheWVyIG9yIFJ1bnRpbWUgU3VwcG9ydClcbiAgICAgKi9cbiAgICByZWFkb25seSBvblJlc2V0OiAoXG4gICAgICBlZmY6IExvZ2ljLk9mPFNoLCBSLCB2b2lkLCBuZXZlcj5cbiAgICApID0+IExvZ2ljLk9mPFNoLCBSLCB2b2lkLCBuZXZlcj5cbiAgfVxuICAvKipcbiAgICogXHU3RURGXHU0RTAwXHU0RjlEXHU4RDU2XHU2Q0U4XHU1MTY1XHU1MTY1XHU1M0UzXHVGRjFBXG4gICAqIC0gXHU0RjIwXHU1MTY1IE1vZHVsZSBcdTVCOUFcdTRFNDlcdUZGMUFcdThGRDRcdTU2REVcdThERTggTW9kdWxlIFx1OEJCRlx1OTVFRVx1NzUyOFx1NzY4NCBMb2dpeC5SZWFkb25seU1vZHVsZUhhbmRsZVx1RkYxQlxuICAgKiAtIFx1NEYyMFx1NTE2NVx1NjY2RVx1OTAxQSBTZXJ2aWNlIFRhZyBcdTY1RjZcdUZGMUFcdThGRDRcdTU2REUgU2VydmljZSBcdTVCOUVcdTRGOEJcdTMwMDJcbiAgICpcbiAgICogXHU4QkY0XHU2NjBFXHVGRjFBXHU2QjYzXHU1RjBGXHU1QjlFXHU3M0IwXHU0RTJEXHU2M0E4XHU4MzUwXHU0RjE4XHU1MTQ4XHU2M0E1XHU2NTM2IE1vZHVsZSBcdTVCOUFcdTRFNDlcdUZGMENcdTUxNzZcdTRGNTkgVGFnIFx1ODlDNlx1NEUzQSBTZXJ2aWNlXHUzMDAyXG4gICAqIFx1NjcyQyBQb0MgXHU1NzI4XHU3QzdCXHU1NzhCXHU0RTBBXHU0RUNEXHU0RjdGXHU3NTI4IFRhZy9Nb2R1bGUgXHU1MzYwXHU0RjREXHVGRjBDXHU0RjQ2XHU4QzAzXHU3NTI4XHU0RkE3XHU2M0E4XHU4MzUwXHU0RjIwXHU1MTY1IE1vZHVsZVx1MzAwMlxuICAgKi9cbiAgcmVhZG9ubHkgdXNlOiB7XG4gICAgPFNoMiBleHRlbmRzIExvZ2l4LkFueU1vZHVsZVNoYXBlPihcbiAgICAgIG1vZHVsZTogaW1wb3J0KFwiLi9pbnRlcm5hbC9tb2R1bGUuanNcIikuTW9kdWxlSW5zdGFuY2U8c3RyaW5nLCBTaDI+XG4gICAgKTogTG9naWMuT2Y8U2gsIFIsIExvZ2l4Lk1vZHVsZUhhbmRsZTxTaDI+LCBuZXZlcj5cbiAgICA8U3ZjLCBJZCA9IHVua25vd24+KFxuICAgICAgdGFnOiBDb250ZXh0LlRhZzxJZCwgU3ZjPlxuICAgICk6IExvZ2ljLk9mPFNoLCBSLCBTdmMsIG5ldmVyPlxuICB9XG4gIC8qKlxuICAgKiB1c2VSZW1vdGVcdUZGMUFcdTRFRTVcdTMwMENcdTUzRUFcdThCRkIgQm91bmQgQVBJXHUzMDBEXHU4OUM2XHU4OUQyXHU4QkJGXHU5NUVFXHU1MTc2XHU0RUQ2IE1vZHVsZVx1MzAwMlxuICAgKlxuICAgKiAtIFx1NTE5OVx1NkNENVx1NEUwQVx1OEQzNFx1OEZEMVx1NUY1M1x1NTI0RFx1NkEyMVx1NTc1N1x1NzY4NCBgJGBcdUZGMDhvblN0YXRlIC8gb25BY3Rpb24gLyBvbiAvIGFjdGlvbnNcdUZGMDlcdUZGMUJcbiAgICogLSBcdTgwRkRcdThCRkJcdTMwMDFcdTgwRkRcdTc2RDFcdTU0MkNcdTMwMDFcdTgwRkRcdTZEM0VcdTUzRDEgQWN0aW9uXHVGRjBDXHU0RjQ2XHU0RTBEXHU4MEZEXHU3NkY0XHU2M0E1XHU4REU4XHU2QTIxXHU1NzU3XHU1MTk5IFN0YXRlXHUzMDAyXG4gICAqL1xuICByZWFkb25seSB1c2VSZW1vdGU6IDxTaDIgZXh0ZW5kcyBMb2dpeC5BbnlNb2R1bGVTaGFwZT4oXG4gICAgbW9kdWxlOiBpbXBvcnQoXCIuL2ludGVybmFsL21vZHVsZS5qc1wiKS5Nb2R1bGVJbnN0YW5jZTxzdHJpbmcsIFNoMj5cbiAgKSA9PiBMb2dpYy5PZjxTaCwgUiwgUmVtb3RlQm91bmRBcGk8U2gsIFNoMiwgUj4sIG5ldmVyPlxuXG4gIC8qKlxuICAgKiBBY3Rpb24gXHU3NkQxXHU1NDJDXHU1MTY1XHU1M0UzXHVGRjFBXHU2NTJGXHU2MzAxXHU4QzEzXHU4QkNEXHUzMDAxX3RhZyAvIHR5cGUgXHU1QjU3XHU5NzYyXHU5MUNGXHUzMDAxXHU1MDNDXHU1QkY5XHU4QzYxXHU2MjE2IFNjaGVtYSBcdTRGNUNcdTRFM0FcdTMwMENcdTUwM0NcdTkwMDlcdTYyRTlcdTU2NjhcdTMwMERcdThGREJcdTg4NENcdTUzRDhcdTRGNTNcdTdGMjlcdTVDMEZcdTMwMDJcbiAgICpcbiAgICogXHU3OTNBXHU0RjhCXHVGRjFBXG4gICAqICAgJC5vbkFjdGlvbignaW5jJylcbiAgICogICAkLm9uQWN0aW9uKEFjdGlvbnMuaW5jKVxuICAgKiAgICQub25BY3Rpb24oQ291bnRlckFjdGlvbi5JbmNTY2hlbWEpXG4gICAqL1xuICByZWFkb25seSBvbkFjdGlvbjoge1xuICAgIC8vIDEuIFx1NTE3Q1x1NUJCOVx1NTM5Rlx1NjcwOVx1NUY2Mlx1NUYwRlx1RkYxQVx1N0M3Qlx1NTc4Qlx1NUI4OFx1NTM2Qlx1OEMxM1x1OEJDRFxuICAgIDxUIGV4dGVuZHMgTG9naXguQWN0aW9uT2Y8U2g+PihcbiAgICAgIHByZWRpY2F0ZTogKGE6IExvZ2l4LkFjdGlvbk9mPFNoPikgPT4gYSBpcyBUXG4gICAgKTogTG9naWMuSW50ZW50QnVpbGRlcjxULCBTaCwgUj5cblxuICAgIC8vIDIuIFx1OTAxQVx1OEZDNyBfdGFnIC8gdHlwZSBcdTVCNTdcdTk3NjJcdTkxQ0ZcdTUzMzlcdTkxNERcdTY3RDBcdTRFMDBcdTUzRDhcdTRGNTNcbiAgICA8XG4gICAgICBLIGV4dGVuZHMgTG9naXguQWN0aW9uT2Y8U2g+IGV4dGVuZHMgeyBfdGFnOiBzdHJpbmcgfVxuICAgICAgICA/IExvZ2l4LkFjdGlvbk9mPFNoPltcIl90YWdcIl1cbiAgICAgICAgOiBuZXZlclxuICAgID4oXG4gICAgICB0YWc6IEtcbiAgICApOiBMb2dpYy5JbnRlbnRCdWlsZGVyPFxuICAgICAgRXh0cmFjdDxMb2dpeC5BY3Rpb25PZjxTaD4sIHsgX3RhZzogSyB9IHwgeyB0eXBlOiBLIH0+LFxuICAgICAgU2gsXG4gICAgICBSXG4gICAgPlxuXG4gICAgLy8gMy4gXHU5MDFBXHU4RkM3XHU1MTc3XHU0RjUzIEFjdGlvbiBcdTUwM0NcdUZGMDhcdTRGOEJcdTU5ODIgQWN0aW9ucy5pbmNcdUZGMDlcdThGREJcdTg4NENcdTdGMjlcdTVDMEZcbiAgICA8QSBleHRlbmRzIExvZ2l4LkFjdGlvbk9mPFNoPiAmICh7IF90YWc6IHN0cmluZyB9IHwgeyB0eXBlOiBzdHJpbmcgfSk+KFxuICAgICAgdmFsdWU6IEFcbiAgICApOiBMb2dpYy5JbnRlbnRCdWlsZGVyPEEsIFNoLCBSPlxuXG4gICAgLy8gNC4gXHU5MDFBXHU4RkM3IFNjaGVtYVx1RkYwOFx1NTM1NVx1NEUwMFx1NTNEOFx1NEY1MyBTY2hlbWFcdUZGMDlcdThGREJcdTg4NENcdTdGMjlcdTVDMEZcbiAgICA8U2MgZXh0ZW5kcyBMb2dpeC5BbnlTY2hlbWE+KFxuICAgICAgc2NoZW1hOiBTY1xuICAgICk6IExvZ2ljLkludGVudEJ1aWxkZXI8XG4gICAgICBFeHRyYWN0PExvZ2l4LkFjdGlvbk9mPFNoPiwgU2NoZW1hLlNjaGVtYS5UeXBlPFNjPj4sXG4gICAgICBTaCxcbiAgICAgIFJcbiAgICA+XG4gIH0gJiB7XG4gICAgW0sgaW4ga2V5b2YgU2hbXCJhY3Rpb25NYXBcIl1dOiBMb2dpYy5JbnRlbnRCdWlsZGVyPFxuICAgICAgRXh0cmFjdDxMb2dpeC5BY3Rpb25PZjxTaD4sIHsgX3RhZzogSyB9IHwgeyB0eXBlOiBLIH0+LFxuICAgICAgU2gsXG4gICAgICBSXG4gICAgPlxuICB9XG5cbiAgcmVhZG9ubHkgb25TdGF0ZTogPFY+KFxuICAgIHNlbGVjdG9yOiAoczogTG9naXguU3RhdGVPZjxTaD4pID0+IFZcbiAgKSA9PiBMb2dpYy5JbnRlbnRCdWlsZGVyPFYsIFNoLCBSPlxuXG4gIC8qKlxuICAgKiBQcmltYXJ5IFJlZHVjZXIgXHU2Q0U4XHU1MThDXHU1MTY1XHU1M0UzXHVGRjFBXG4gICAqIC0gXHU4QkVEXHU0RTQ5XHVGRjFBXHU0RTNBXHU2N0QwXHU0RTJBIEFjdGlvbiBUYWcgXHU2Q0U4XHU1MThDXHU0RTAwXHU2NzYxXHU1NDBDXHU2QjY1XHUzMDAxXHU3RUFGXHU3MkI2XHU2MDAxXHU1M0Q4XHU2MzYyXHU3Njg0XHU0RTNCIHJlZHVjZXJcdUZGMUJcbiAgICogLSBcdTVCOUVcdTczQjBcdUZGMUFcdTc2RjRcdTYzQTVcdTg0M0RcdTUyMzAgUnVudGltZSBcdTc2ODQgYF90YWcgLT4gKHN0YXRlLCBhY3Rpb24pID0+IHN0YXRlYCBcdTY2MjBcdTVDMDRcdUZGMENcdTgwMENcdTk3NUUgd2F0Y2hlciAvIEZsb3dcdTMwMDJcbiAgICpcbiAgICogXHU3RUE2XHU2NzVGXHVGRjFBXG4gICAqIC0gXHU2QkNGXHU0RTJBIEFjdGlvbiBUYWcgXHU2NzAwXHU1OTFBXHU1MTQxXHU4QkI4XHU0RTAwXHU0RTJBIHByaW1hcnkgcmVkdWNlclx1RkYxQlx1OTFDRFx1NTkwRFx1NkNFOFx1NTE4Q1x1ODlDNlx1NEUzQVx1OTUxOVx1OEJFRlx1RkYxQlxuICAgKiAtIHJlZHVjZXIgXHU1RkM1XHU5ODdCXHU2NjJGXHU3RUFGXHU1MUZEXHU2NTcwXHVGRjBDXHU0RTBEXHU0RjlEXHU4RDU2IEVudlx1RkYwQ1x1NEUwRFx1NEVBN1x1NzUxRiBFZmZlY3RcdTMwMDJcbiAgICovXG4gIHJlYWRvbmx5IHJlZHVjZXI6IDxcbiAgICBLIGV4dGVuZHMga2V5b2YgU2hbXCJhY3Rpb25NYXBcIl0sXG4gICAgQSBleHRlbmRzIEV4dHJhY3Q8XG4gICAgICBMb2dpeC5BY3Rpb25PZjxTaD4sXG4gICAgICB7IF90YWc6IEsgfSB8IHsgdHlwZTogSyB9XG4gICAgPlxuICA+KFxuICAgIHRhZzogSyxcbiAgICByZWR1Y2VyOiAoXG4gICAgICBzdGF0ZTogTG9naXguU3RhdGVPZjxTaD4sXG4gICAgICBhY3Rpb246IEFcbiAgICApID0+IExvZ2l4LlN0YXRlT2Y8U2g+XG4gICkgPT4gTG9naWMuT2Y8U2gsIFIsIHZvaWQsIG5ldmVyPlxuXG4gIHJlYWRvbmx5IG9uOiA8Vj4oXG4gICAgc291cmNlOiBTdHJlYW0uU3RyZWFtPFY+XG4gICkgPT4gTG9naWMuSW50ZW50QnVpbGRlcjxWLCBTaCwgUj5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2U8U2ggZXh0ZW5kcyBMb2dpeC5BbnlNb2R1bGVTaGFwZSwgUiA9IG5ldmVyPihcbiAgc2hhcGU6IFNoLFxuICBydW50aW1lOiBMb2dpeC5Nb2R1bGVSdW50aW1lPExvZ2l4LlN0YXRlT2Y8U2g+LCBMb2dpeC5BY3Rpb25PZjxTaD4+XG4pOiBCb3VuZEFwaVB1YmxpYzxTaCwgUj4ge1xuICByZXR1cm4gQm91bmRBcGlSdW50aW1lLm1ha2Uoc2hhcGUsIHJ1bnRpbWUpIGFzIEJvdW5kQXBpUHVibGljPFNoLCBSPlxufVxuIiwgImltcG9ydCB7IEVmZmVjdCB9IGZyb20gXCJlZmZlY3RcIlxuaW1wb3J0ICogYXMgTW9kdWxlRmFjdG9yeSBmcm9tIFwiLi9pbnRlcm5hbC9ydW50aW1lL01vZHVsZUZhY3RvcnkuanNcIlxuaW1wb3J0IHR5cGUge1xuICBBbnlNb2R1bGVTaGFwZSxcbiAgTW9kdWxlSGFuZGxlLFxuICBNb2R1bGVJbnN0YW5jZSxcbn0gZnJvbSBcIi4vaW50ZXJuYWwvbW9kdWxlLmpzXCJcblxuLyoqXG4gKiBMaW5rLm1ha2UgXHU5MTREXHU3RjZFXHVGRjFBXG4gKiAtIG1vZHVsZXNcdUZGMUFcdTUzQzJcdTRFMEVcdTVGNTNcdTUyNEQgTGluayBcdTc2ODQgTW9kdWxlIFx1NTIxN1x1ODg2OFx1RkYxQlxuICogICAtIGtleSBcdTVDMDZcdTY3NjVcdTgxRUEgTW9kdWxlIFx1NUI5QVx1NEU0OVx1NjVGNlx1NzY4NCBpZFx1RkYwOFx1NEY4Qlx1NTk4MiBMb2dpeC5Nb2R1bGUubWFrZShcIlVzZXJcIiwgLi4uKSBcdTc2ODQgXCJVc2VyXCJcdUZGMDlcdTMwMDJcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMaW5rQ29uZmlnPFxuICBNcyBleHRlbmRzIHJlYWRvbmx5IE1vZHVsZUluc3RhbmNlPHN0cmluZywgQW55TW9kdWxlU2hhcGU+W11cbj4ge1xuICAvKipcbiAgICogTGluayBcdTc2ODRcdTY4MDdcdThCQzZcdUZGMUFcbiAgICogLSBcdTUzRUZcdTkwMDlcdUZGMUJcdTlFRDhcdThCQTRcdTY4MzlcdTYzNkVcdTUzQzJcdTRFMEVcdTc2ODQgbW9kdWxlcy5pZCBcdTYyRkNcdTYzQTVcdTc1MUZcdTYyMTBcdTRFMDBcdTRFMkFcdTdBMzNcdTVCOUFcdTVCNTdcdTdCMjZcdTRFMzJcdUZGMUJcbiAgICogLSBcdTY3MkFcdTY3NjVcdTUzRUZcdTc1MjhcdTRFOEUgVW5pdmVyc2UgLyBEZXZUb29scyBcdTRFMkRcdTVDNTVcdTc5M0FcdTU0OENcdTVCOUFcdTRGNEQgTGluayBcdTgyODJcdTcwQjlcdTMwMDJcbiAgICovXG4gIHJlYWRvbmx5IGlkPzogc3RyaW5nXG4gIHJlYWRvbmx5IG1vZHVsZXM6IE1zXG59XG5cbi8qKlxuICogXHU1N0ZBXHU0RThFIE1vZHVsZSBcdTUyMTdcdTg4NjhcdTYzQThcdTVCRkMgTGluayBcdTkwM0JcdThGOTFcdTRFMkRcdTUzRUZcdTc1MjhcdTc2ODRcdTUzRTVcdTY3QzRcdTg5QzZcdTU2RkVcdUZGMUFcbiAqIC0ga2V5IFx1NEUzQSBNb2R1bGUgXHU1QjlBXHU0RTQ5XHU2NUY2XHU3Njg0IGlkXHVGRjFCXG4gKiAtIHZhbHVlIFx1NEUzQVx1OEJFNSBNb2R1bGUgXHU3Njg0XHU1M0VBXHU4QkZCXHU1M0U1XHU2N0M0XHUzMDAyXG4gKi9cbmV4cG9ydCB0eXBlIExpbmtIYW5kbGVzPFxuICBNcyBleHRlbmRzIHJlYWRvbmx5IE1vZHVsZUluc3RhbmNlPHN0cmluZywgQW55TW9kdWxlU2hhcGU+W11cbj4gPSB7XG4gIFtNIGluIE1zW251bWJlcl0gYXMgTVtcImlkXCJdXTogTW9kdWxlSGFuZGxlPE1bXCJzaGFwZVwiXT5cbn1cblxuLyoqXG4gKiBcdTUxODVcdTkwRThcdThGODVcdTUyQTlcdTdDN0JcdTU3OEJcdUZGMUFcdTVDMDYgTW9kdWxlIFx1NTIxN1x1ODg2OFx1OEY2Q1x1NjM2Mlx1NEUzQVx1NEVFNSBpZCBcdTRFM0Ega2V5IFx1NzY4NFx1NjYyMFx1NUMwNFx1RkYwQ1xuICogXHU0RkJGXHU0RThFXHU1OTBEXHU3NTI4XHU1RTk1XHU1QzQyIE1vZHVsZUZhY3RvcnkuTGluayBcdTc2ODRcdTVCOUVcdTczQjBcdTMwMDJcbiAqL1xudHlwZSBNb2R1bGVzUmVjb3JkPFxuICBNcyBleHRlbmRzIHJlYWRvbmx5IE1vZHVsZUluc3RhbmNlPHN0cmluZywgQW55TW9kdWxlU2hhcGU+W11cbj4gPSB7XG4gIFtNIGluIE1zW251bWJlcl0gYXMgTVtcImlkXCJdXTogTVxufVxuXG4vKipcbiAqIExpbmsubWFrZVx1RkYxQVxuICogLSBcdTU3RkFcdTRFOEVcdTUzQzJcdTRFMEVcdTc2ODQgTW9kdWxlIFx1NTIxN1x1ODg2OFx1NEUwRVx1OTAzQlx1OEY5MVx1N0EwQlx1NUU4Rlx1RkYwQ1x1Njc4NFx1OTAyMCBMaW5rXHVGRjA4XHU4REU4XHU2QTIxXHU1NzU3XHU4MEY2XHU2QzM0XHU5MDNCXHU4RjkxXHVGRjA5XHVGRjFCXG4gKiAtIFx1OEZENFx1NTZERVx1NTAzQ1x1NjYyRlx1MjAxQ1x1NTFCN1x1MjAxRFx1NzY4NCBFZmZlY3RcdUZGMENcdTkwMUFcdTVFMzhcdTYzMDJcdTUyMzAgTW9kdWxlSW1wbC5pbXBsZW1lbnQoeyBwcm9jZXNzZXMvbGlua3MgfSkgXHU0RTJEXHVGRjBDXG4gKiAgIFx1NzUzMVx1OEZEMFx1ODg0Q1x1NjVGNlx1NUJCOVx1NTY2OFx1N0VERlx1NEUwMCBmb3JrXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlPFxuICBNcyBleHRlbmRzIHJlYWRvbmx5IE1vZHVsZUluc3RhbmNlPHN0cmluZywgQW55TW9kdWxlU2hhcGU+W10sXG4gIEUgPSBuZXZlcixcbiAgUiA9IG5ldmVyXG4+KFxuICBjb25maWc6IExpbmtDb25maWc8TXM+LFxuICBsb2dpYzogKCQ6IExpbmtIYW5kbGVzPE1zPikgPT4gRWZmZWN0LkVmZmVjdDx2b2lkLCBFLCBSPlxuKTogRWZmZWN0LkVmZmVjdDx2b2lkLCBFLCBSPiB7XG4gIC8vIFx1OUVEOFx1OEJBNCBpZFx1RkYxQVx1NjMwOVx1NzE2N1x1NTNDMlx1NEUwRSBNb2R1bGUgXHU3Njg0IGlkIFx1NjM5Mlx1NUU4Rlx1NTQwRVx1NjJGQ1x1NjNBNVx1RkYwQ1x1NEZERFx1OEJDMVx1OTg3QVx1NUU4Rlx1NjVFMFx1NTE3M1x1NzY4NFx1N0EzM1x1NUI5QVx1NjAyN1xuICBjb25zdCBsaW5rSWQgPVxuICAgIGNvbmZpZy5pZCA/P1xuICAgIFsuLi5jb25maWcubW9kdWxlc11cbiAgICAgIC5tYXAoKG0pID0+IG0uaWQpXG4gICAgICAuc29ydCgpXG4gICAgICAuam9pbihcIn5cIilcblxuICAvLyBcdTVDMDYgTW9kdWxlIFx1NTIxN1x1ODg2OFx1OEY2Q1x1NjM2Mlx1NEUzQVx1NEVFNSBpZCBcdTRFM0Ega2V5IFx1NzY4NFx1NjYyMFx1NUMwNFxuICBjb25zdCBtb2R1bGVzUmVjb3JkID0gT2JqZWN0LmNyZWF0ZShudWxsKSBhcyBNb2R1bGVzUmVjb3JkPE1zPlxuXG4gIGZvciAoY29uc3QgbW9kdWxlIG9mIGNvbmZpZy5tb2R1bGVzKSB7XG4gICAgLy8gXHU4RkQwXHU4ODRDXHU2NUY2XHU0RjdGXHU3NTI4IG1vZHVsZS5pZCBcdTRGNUNcdTRFM0Ega2V5XHVGRjBDXHU3QzdCXHU1NzhCXHU0RTBBXHU3NTMxIE1vZHVsZXNSZWNvcmQgXHU0RkREXHU4QkMxXHU3RUE2XHU2NzVGXG4gICAgOyhtb2R1bGVzUmVjb3JkIGFzIGFueSlbbW9kdWxlLmlkXSA9IG1vZHVsZVxuICB9XG5cbiAgLy8gXHU1OTBEXHU3NTI4XHU3M0IwXHU2NzA5IE1vZHVsZUZhY3RvcnkuTGluayBcdTVCOUVcdTczQjBcdUZGMENcdTdDN0JcdTU3OEJcdTRFMEEgTGlua0hhbmRsZXMgXHU0RTBFIEZhY3RvcnkgXHU3Njg0XHU1M0U1XHU2N0M0XHU3RUQzXHU2Nzg0XHU0RTAwXHU4MUY0XG4gIGNvbnN0IGVmZmVjdCA9IE1vZHVsZUZhY3RvcnkuTGluayhcbiAgICBtb2R1bGVzUmVjb3JkIGFzIGFueSxcbiAgICBsb2dpYyBhcyBhbnlcbiAgKSBhcyBFZmZlY3QuRWZmZWN0PHZvaWQsIEUsIFI+XG5cbiAgLy8gXHU1QzA2IGxpbmtJZCBcdTRGNUNcdTRFM0FcdTUxNDNcdTRGRTFcdTYwNkZcdTk2NDRcdTUyQTBcdTU3MjggRWZmZWN0IFx1NEUwQVx1RkYwQ1x1NEY5Qlx1NTQwRVx1N0VFRCBSdW50aW1lIC8gRGV2VG9vbHMgXHU2MzA5XHU5NzAwXHU2RDg4XHU4RDM5XHUzMDAyXG4gIDsoZWZmZWN0IGFzIGFueSkuX2xpbmtJZCA9IGxpbmtJZFxuXG4gIHJldHVybiBlZmZlY3Rcbn1cbiIsICJpbXBvcnQgdHlwZSB7IEFueU1vZHVsZVNoYXBlLCBNb2R1bGVTaGFwZSB9IGZyb20gXCIuL2ludGVybmFsL21vZHVsZS5qc1wiXG5pbXBvcnQgdHlwZSAqIGFzIExvZ2ljIGZyb20gXCIuL0xvZ2ljLmpzXCJcbmltcG9ydCAqIGFzIEZsb3dSdW50aW1lIGZyb20gXCIuL2ludGVybmFsL3J1bnRpbWUvRmxvd1J1bnRpbWUuanNcIlxuXG4vLyBGbG93XHVGRjFBXHU1QkY5XHU1OTE2XHU2NkI0XHU5NzMyXHU3Njg0XHU0RTFBXHU1MkExXHU2RDQxXHU3RjE2XHU2MzkyXHU2M0E1XHU1M0UzXHVGRjA4XHU1QzAxXHU4OEM1IGludGVybmFsL3J1bnRpbWUvRmxvd1J1bnRpbWUgXHU1MTg1XHU2ODM4XHVGRjA5XHUzMDAyXG5cbmV4cG9ydCB0eXBlIEVudjxTaCBleHRlbmRzIEFueU1vZHVsZVNoYXBlLCBSID0gdW5rbm93bj4gPSBMb2dpYy5FbnY8XG4gIFNoLFxuICBSXG4+XG5cbmV4cG9ydCB0eXBlIEFwaTxTaCBleHRlbmRzIE1vZHVsZVNoYXBlPGFueSwgYW55PiwgUiA9IG5ldmVyPiA9XG4gIEZsb3dSdW50aW1lLkFwaTxTaCwgUj5cblxuZXhwb3J0IGNvbnN0IG1ha2UgPSBGbG93UnVudGltZS5tYWtlXG4iLCAiaW1wb3J0IHR5cGUgeyBGbHVlbnRNYXRjaCwgRmx1ZW50TWF0Y2hUYWcgfSBmcm9tIFwiLi9Mb2dpYy5qc1wiXG5pbXBvcnQgKiBhcyBJbnRlcm5hbCBmcm9tIFwiLi9pbnRlcm5hbC9NYXRjaEJ1aWxkZXIuanNcIlxuXG4vLyBNYXRjaEJ1aWxkZXJcdUZGMUFcdTVCRjlcdTU5MTZcdTY2QjRcdTk3MzIgRmx1ZW50IE1hdGNoIERTTFx1RkYwQ1x1NTE4NVx1OTBFOFx1NUI5RVx1NzNCMFx1NTkwRFx1NzUyOCBpbnRlcm5hbC9NYXRjaEJ1aWxkZXJcdTMwMDJcblxuZXhwb3J0IGNvbnN0IG1ha2VNYXRjaDogPFY+KHZhbHVlOiBWKSA9PiBGbHVlbnRNYXRjaDxWPiA9IEludGVybmFsLm1ha2VNYXRjaFxuXG5leHBvcnQgY29uc3QgbWFrZU1hdGNoVGFnOiA8ViBleHRlbmRzIHsgX3RhZzogc3RyaW5nIH0+KFxuICB2YWx1ZTogVlxuKSA9PiBGbHVlbnRNYXRjaFRhZzxWPiA9IEludGVybmFsLm1ha2VNYXRjaFRhZ1xuIiwgImltcG9ydCB7IEVmZmVjdCwgTGF5ZXIsIE1hbmFnZWRSdW50aW1lIH0gZnJvbSAnZWZmZWN0J1xuaW1wb3J0IHR5cGUgeyBBbnlNb2R1bGVTaGFwZSwgTW9kdWxlSW1wbCB9IGZyb20gJy4vaW50ZXJuYWwvbW9kdWxlLmpzJ1xuaW1wb3J0ICogYXMgQXBwUnVudGltZUltcGwgZnJvbSAnLi9pbnRlcm5hbC9ydW50aW1lL0FwcFJ1bnRpbWUuanMnXG5pbXBvcnQgKiBhcyBEZWJ1ZyBmcm9tICcuL0RlYnVnLmpzJ1xuXG4vKipcbiAqIFJ1bnRpbWUgXHU5MTREXHU3RjZFXHVGRjFBXG4gKiAtIGxheWVyXHVGRjFBXHU5ODlEXHU1OTE2XHU3Njg0XHU5ODc2XHU1QzQyIEVudlx1RkYwOFx1NTk4MiBDb25maWcgLyBcdTVFNzNcdTUzRjBcdTY3MERcdTUyQTFcdUZGMDlcdUZGMENcdTRGMUFcdTRFMEUgUm9vdCBNb2R1bGVJbXBsLmxheWVyIFx1NTQwOFx1NUU3Nlx1RkYxQlxuICogLSBvbkVycm9yXHVGRjFBQXBwIFx1N0VBN1x1OTUxOVx1OEJFRlx1NTkwNFx1NzQwNlx1NTE2NVx1NTNFM1x1RkYwQ1x1NzUyOFx1NEU4RVx1NTcyOCBSdW50aW1lIFx1N0VBN1x1N0VERlx1NEUwMFx1NEUwQVx1NjJBNVx1NjcyQVx1NjM1NVx1ODNCN1x1OTUxOVx1OEJFRlx1MzAwMlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJ1bnRpbWVPcHRpb25zIHtcbiAgcmVhZG9ubHkgbGF5ZXI/OiBMYXllci5MYXllcjxhbnksIG5ldmVyLCBuZXZlcj5cbiAgcmVhZG9ubHkgb25FcnJvcj86IChjYXVzZTogaW1wb3J0KCdlZmZlY3QnKS5DYXVzZS5DYXVzZTx1bmtub3duPikgPT4gRWZmZWN0LkVmZmVjdDx2b2lkPlxuICAvKipcbiAgICogXHU1M0VGXHU5MDA5XHVGRjFBXHU0RTNBXHU1RjUzXHU1MjREIE1hbmFnZWRSdW50aW1lIFx1NjMwN1x1NUI5QVx1NEUwMFx1NEUyQVx1OTAzQlx1OEY5MVx1NjgwN1x1OEJDNlx1RkYwOFx1NEY4Qlx1NTk4MiBcIkFwcERlbW9SdW50aW1lXCJcdUZGMDlcdUZGMENcbiAgICogXHU3NTI4XHU0RThFIERlYnVnIC8gRGV2VG9vbHMgXHU1MjA2XHU3RUM0XHU1QzU1XHU3OTNBXHUzMDAyXG4gICAqL1xuICByZWFkb25seSBsYWJlbD86IHN0cmluZ1xufVxuXG4vKipcbiAqIFJ1bnRpbWUubWFrZVxuICpcbiAqIFx1NTcyOFx1N0VEOVx1NUI5QSBSb290IE1vZHVsZUltcGwgXHU3Njg0XHU1MjREXHU2M0QwXHU0RTBCXHVGRjBDXHU2Nzg0XHU5MDIwXHU0RTAwXHU5ODk3XHU1RTk0XHU3NTI4XHU3RUE3IFJ1bnRpbWVcdUZGMUFcbiAqXG4gKiAtIFx1NEY3Rlx1NzUyOCBSb290SW1wbC5tb2R1bGUgKyBSb290SW1wbC5sYXllciBcdTRGNUNcdTRFM0FcdTU1MkZcdTRFMDBcdTc2ODRcdTUxNjhcdTVDNDBcdTZBMjFcdTU3NTdcdUZGMUJcbiAqIC0gXHU1QzA2IFJvb3RJbXBsLnByb2Nlc3NlcyBcdTRGNUNcdTRFM0FcdTk1N0ZcdTY3MUZcdThGREJcdTdBMEJcdTU3MjggUnVudGltZSBTY29wZSBcdTUxODVcdTdFREZcdTRFMDAgZm9ya1x1RkYxQlxuICogLSBcdTU5MERcdTc1MjhcdTczQjBcdTY3MDkgQXBwUnVudGltZSBcdTVCOUVcdTczQjBcdTRGNUNcdTRFM0FcdTVFOTVcdTVDNDJcdTVCQjlcdTU2NjhcdUZGMENcdTVCRjlcdTU5MTZcdTRFQzVcdTY2QjRcdTk3MzIgTWFuYWdlZFJ1bnRpbWVcdTMwMDJcbiAqXG4gKiBcdThCRjRcdTY2MEVcdUZGMUFcbiAqIC0gXHU3QzdCXHU1NzhCXHU1QzQyXHU5NzYyXHU0RjdGXHU3NTI4XHU1QkJEXHU2Q0RCXHU3Njg0IGFueS9uZXZlclx1RkYwQ1x1NEVFNVx1OTA3Rlx1NTE0RFx1NTcyOFx1NkI2NFx1NTkwNFx1NUYxNVx1NTE2NVx1NTkwRFx1Njc0Mlx1NzY4NCBFbnYgXHU2M0E4XHU1QkZDXHVGRjFCXG4gKiAtIFx1NEUxQVx1NTJBMVx1NEVFM1x1NzgwMVx1NTNFQVx1OTcwMFx1ODk4MVx1NEZERFx1OEJDMSBSb290SW1wbC5sYXllciBcdTRFMEUgb3B0aW9ucy5sYXllciBcdTRFMDBcdThENzdcdTgwRkRcdTY3ODRcdTkwMjBcdTVCOENcdTY1NzQgRW52XHUzMDAyXG4gKi9cbmV4cG9ydCBjb25zdCBtYWtlID0gKFxuICByb290SW1wbDogTW9kdWxlSW1wbDxhbnksIEFueU1vZHVsZVNoYXBlLCBhbnk+LFxuICBvcHRpb25zPzogUnVudGltZU9wdGlvbnMsXG4pOiBNYW5hZ2VkUnVudGltZS5NYW5hZ2VkUnVudGltZTxhbnksIG5ldmVyPiA9PiB7XG4gIC8vIFx1NTdGQVx1Nzg0MCBFbnZcdUZGMUFcdTVCOENcdTUxNjhcdTc1MzFcdThDMDNcdTc1MjhcdTY1QjlcdTYzRDBcdTRGOUJcdTc2ODQgTGF5ZXIgXHU1MUIzXHU1QjlBXHVGRjA4XHU1OTgyIENvbmZpZyAvIFx1NUU3M1x1NTNGMFx1NjcwRFx1NTJBMSAvIERlYnVnTGF5ZXIgXHU3QjQ5XHVGRjA5XHVGRjBDXG4gIC8vIFx1ODJFNVx1OTcwMFx1ODk4MVx1NTQyRlx1NzUyOFx1OUVEOFx1OEJBNCBEZWJ1ZyBcdTgwRkRcdTUyOUJcdUZGMENcdTYzQThcdTgzNTBcdTY2M0VcdTVGMEZcdTRGN0ZcdTc1MjggTG9naXguRGVidWcud2l0aERlZmF1bHRMYXllciguLi4pIFx1OEZEQlx1ODg0Q1x1N0VDNFx1NTQwOFx1MzAwMlxuICBjb25zdCBiYXNlTGF5ZXIgPSAob3B0aW9ucz8ubGF5ZXIgPz8gTGF5ZXIuZW1wdHkpIGFzIExheWVyLkxheWVyPGFueSwgbmV2ZXIsIG5ldmVyPlxuXG4gIGNvbnN0IGFwcExheWVyID1cbiAgICBvcHRpb25zPy5sYWJlbCAhPSBudWxsXG4gICAgICA/IChMYXllci5tZXJnZUFsbChcbiAgICAgICAgICBEZWJ1Zy5ydW50aW1lTGFiZWwob3B0aW9ucy5sYWJlbCksXG4gICAgICAgICAgYmFzZUxheWVyLFxuICAgICAgICApIGFzIExheWVyLkxheWVyPGFueSwgbmV2ZXIsIG5ldmVyPilcbiAgICAgIDogYmFzZUxheWVyXG5cbiAgY29uc3QgYXBwQ29uZmlnOiBBcHBSdW50aW1lSW1wbC5Mb2dpeEFwcENvbmZpZzxhbnk+ID0ge1xuICAgIGxheWVyOiBhcHBMYXllcixcbiAgICBtb2R1bGVzOiBbQXBwUnVudGltZUltcGwucHJvdmlkZShyb290SW1wbC5tb2R1bGUsIHJvb3RJbXBsLmxheWVyIGFzIExheWVyLkxheWVyPGFueSwgYW55LCBhbnk+KV0sXG4gICAgcHJvY2Vzc2VzOiByb290SW1wbC5wcm9jZXNzZXMgPz8gW10sXG4gICAgb25FcnJvcjogb3B0aW9ucz8ub25FcnJvcixcbiAgfVxuXG4gIGNvbnN0IGFwcCA9IEFwcFJ1bnRpbWVJbXBsLm1ha2VBcHAoYXBwQ29uZmlnKVxuICByZXR1cm4gYXBwLm1ha2VSdW50aW1lKCkgYXMgTWFuYWdlZFJ1bnRpbWUuTWFuYWdlZFJ1bnRpbWU8YW55LCBuZXZlcj5cbn1cbiIsICJpbXBvcnQgeyBDb250ZXh0LCBFZmZlY3QsIExheWVyLCBNYW5hZ2VkUnVudGltZSB9IGZyb20gXCJlZmZlY3RcIlxuaW1wb3J0IHR5cGUge1xuICBBbnlNb2R1bGVTaGFwZSxcbiAgTW9kdWxlSW5zdGFuY2UsXG4gIE1vZHVsZVJ1bnRpbWUsXG4gIFN0YXRlT2YsXG4gIEFjdGlvbk9mLFxufSBmcm9tIFwiLi9jb3JlL21vZHVsZS5qc1wiXG5cbi8qKlxuICogQXBwTW9kdWxlRW50cnlcdUZGMUFcdTc1MzEgTG9naXgucHJvdmlkZSBcdTc1MUZcdTYyMTBcdTc2ODRcdTZBMjFcdTU3NTdcdTY3NjFcdTc2RUVcdTMwMDJcbiAqXG4gKiAtIG1vZHVsZVx1RkYxQU1vZHVsZSBcdTVCOUFcdTRFNDlcdTVCRjlcdThDNjFcdUZGMDhcdTY1RTJcdTY2MkYgVGFnXHVGRjBDXHU1M0M4XHU2NDNBXHU1RTI2IFNoYXBlIFx1NEZFMVx1NjA2Rlx1NEUwRVx1NURFNVx1NTM4Mlx1ODBGRFx1NTI5Qlx1RkYwOVx1RkYxQlxuICogLSBsYXllclx1RkYxQVx1OEJFNSBNb2R1bGUgXHU1QkY5XHU1RTk0XHU3Njg0IFJ1bnRpbWUgTGF5ZXJcdTMwMDJcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcHBNb2R1bGVFbnRyeSB7XG4gIHJlYWRvbmx5IG1vZHVsZTogTW9kdWxlSW5zdGFuY2U8YW55LCBBbnlNb2R1bGVTaGFwZT5cbiAgcmVhZG9ubHkgbGF5ZXI6IExheWVyLkxheWVyPGFueSwgYW55LCBhbnk+XG4gIC8qKlxuICAgKiBcdTUzRUZcdTkwMDlcdUZGMUFcdTc1MzFcdThCRTVcdTZBMjFcdTU3NTdcdTVCRjlcdTVFOTQgTGF5ZXIgXHU2M0QwXHU0RjlCXHU3Njg0IFNlcnZpY2UgVGFnIFx1NTIxN1x1ODg2OFx1MzAwMlxuICAgKlxuICAgKiAtIFx1NEVDNVx1NzUyOFx1NEU4RSBBcHAgXHU2Nzg0XHU1RUZBXHU5NjM2XHU2QkI1XHU3Njg0IFRhZyBcdTUxQjJcdTdBODFcdTY4QzBcdTZENEJcdTRFMEUgRW52IFx1NjJEM1x1NjI1MVx1NTIwNlx1Njc5MFx1RkYxQlxuICAgKiAtIFx1NTE4NVx1OTBFOFx1NTcyOFx1NEY3Rlx1NzUyOCBBcHBSdW50aW1lIFx1N0VDNFx1ODhDNVx1NUU5NFx1NzUyOFx1ODRERFx1NTZGRVx1NjVGNlx1RkYwQ1x1NTNFRlx1OTAxQVx1OEZDNyBwcm92aWRlV2l0aFRhZ3MgXHU2NjNFXHU1RjBGXHU1OEYwXHU2NjBFXHVGRjFCXG4gICAqIC0gXHU0RTBEXHU1RjcxXHU1NENEXHU4RkQwXHU4ODRDXHU2NUY2XHU4ODRDXHU0RTNBXHVGRjBDXHU0RTBEXHU1OEYwXHU2NjBFXHU1MjE5XHU4OUM2XHU0RTNBXHUyMDFDXHU4QkU1IE1vZHVsZSBMYXllciBcdTY3MkFcdTY2M0VcdTVGMEZcdTYzRDBcdTRGOUIgU2VydmljZSBUYWdcdTIwMURcdTMwMDJcbiAgICovXG4gIHJlYWRvbmx5IHNlcnZpY2VUYWdzPzogUmVhZG9ubHlBcnJheTxDb250ZXh0LlRhZzxhbnksIGFueT4+XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9naXhBcHBDb25maWc8Uj4ge1xuICByZWFkb25seSBsYXllcjogTGF5ZXIuTGF5ZXI8UiwgbmV2ZXIsIG5ldmVyPlxuICByZWFkb25seSBtb2R1bGVzOiBSZWFkb25seUFycmF5PEFwcE1vZHVsZUVudHJ5PlxuICByZWFkb25seSBwcm9jZXNzZXM6IFJlYWRvbmx5QXJyYXk8RWZmZWN0LkVmZmVjdDx2b2lkLCBhbnksIGFueT4+XG4gIHJlYWRvbmx5IG9uRXJyb3I/OiAoXG4gICAgY2F1c2U6IGltcG9ydChcImVmZmVjdFwiKS5DYXVzZS5DYXVzZTx1bmtub3duPlxuICApID0+IEVmZmVjdC5FZmZlY3Q8dm9pZD5cbn1cblxuZXhwb3J0IGludGVyZmFjZSBBcHBEZWZpbml0aW9uPFI+IHtcbiAgcmVhZG9ubHkgZGVmaW5pdGlvbjogTG9naXhBcHBDb25maWc8Uj5cbiAgcmVhZG9ubHkgbGF5ZXI6IExheWVyLkxheWVyPFIsIG5ldmVyLCBuZXZlcj5cbiAgcmVhZG9ubHkgbWFrZVJ1bnRpbWU6ICgpID0+IE1hbmFnZWRSdW50aW1lLk1hbmFnZWRSdW50aW1lPFIsIG5ldmVyPlxufVxuXG5pbnRlcmZhY2UgVGFnSW5mbyB7XG4gIHJlYWRvbmx5IGtleTogc3RyaW5nXG4gIHJlYWRvbmx5IHRhZzogQ29udGV4dC5UYWc8YW55LCBhbnk+XG4gIHJlYWRvbmx5IG93bmVyTW9kdWxlSWQ6IHN0cmluZ1xuICByZWFkb25seSBzb3VyY2U6IFwibW9kdWxlXCIgfCBcInNlcnZpY2VcIlxufVxuXG5pbnRlcmZhY2UgVGFnQ29sbGlzaW9uIHtcbiAgcmVhZG9ubHkga2V5OiBzdHJpbmdcbiAgcmVhZG9ubHkgY29uZmxpY3RzOiBSZWFkb25seUFycmF5PFRhZ0luZm8+XG59XG5cbmludGVyZmFjZSBUYWdDb2xsaXNpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcmVhZG9ubHkgX3RhZzogXCJUYWdDb2xsaXNpb25FcnJvclwiXG4gIHJlYWRvbmx5IGNvbGxpc2lvbnM6IFJlYWRvbmx5QXJyYXk8VGFnQ29sbGlzaW9uPlxufVxuXG5jb25zdCBnZXRUYWdLZXkgPSAodGFnOiBDb250ZXh0LlRhZzxhbnksIGFueT4pOiBzdHJpbmcgPT4ge1xuICBjb25zdCBhbnlUYWcgPSB0YWcgYXMgYW55XG4gIGlmICh0eXBlb2YgYW55VGFnLmtleSA9PT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiBhbnlUYWcua2V5XG4gIH1cbiAgaWYgKHR5cGVvZiBhbnlUYWcuX2lkID09PSBcInN0cmluZ1wiKSB7XG4gICAgcmV0dXJuIGFueVRhZy5faWRcbiAgfVxuICBpZiAodHlwZW9mIGFueVRhZy50b1N0cmluZyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcmV0dXJuIGFueVRhZy50b1N0cmluZygpXG4gIH1cbiAgcmV0dXJuIFwiW3Vua25vd24tdGFnXVwiXG59XG5cbmNvbnN0IGJ1aWxkVGFnSW5kZXggPSAoXG4gIGVudHJpZXM6IFJlYWRvbmx5QXJyYXk8QXBwTW9kdWxlRW50cnk+XG4pOiBNYXA8c3RyaW5nLCBUYWdJbmZvW10+ID0+IHtcbiAgY29uc3QgaW5kZXggPSBuZXcgTWFwPHN0cmluZywgVGFnSW5mb1tdPigpXG5cbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgY29uc3Qgb3duZXJJZCA9IFN0cmluZyhlbnRyeS5tb2R1bGUuaWQpXG5cbiAgICAvLyBcdThCQjBcdTVGNTUgTW9kdWxlIFx1ODFFQVx1OEVBQiBUYWdcbiAgICBjb25zdCBtb2R1bGVUYWcgPSBlbnRyeS5tb2R1bGUgYXMgdW5rbm93biBhcyBDb250ZXh0LlRhZzxhbnksIGFueT5cbiAgICBjb25zdCBtb2R1bGVLZXkgPSBnZXRUYWdLZXkobW9kdWxlVGFnKVxuICAgIGNvbnN0IG1vZHVsZUluZm86IFRhZ0luZm8gPSB7XG4gICAgICBrZXk6IG1vZHVsZUtleSxcbiAgICAgIHRhZzogbW9kdWxlVGFnLFxuICAgICAgb3duZXJNb2R1bGVJZDogb3duZXJJZCxcbiAgICAgIHNvdXJjZTogXCJtb2R1bGVcIlxuICAgIH1cbiAgICBjb25zdCBleGlzdGluZ01vZHVsZUluZm9zID0gaW5kZXguZ2V0KG1vZHVsZUtleSlcbiAgICBpZiAoZXhpc3RpbmdNb2R1bGVJbmZvcykge1xuICAgICAgZXhpc3RpbmdNb2R1bGVJbmZvcy5wdXNoKG1vZHVsZUluZm8pXG4gICAgfSBlbHNlIHtcbiAgICAgIGluZGV4LnNldChtb2R1bGVLZXksIFttb2R1bGVJbmZvXSlcbiAgICB9XG5cbiAgICAvLyBcdThCQjBcdTVGNTVcdTY2M0VcdTVGMEZcdTU4RjBcdTY2MEVcdTc2ODQgU2VydmljZSBUYWdcdUZGMDhcdTU5ODJcdTY3MDlcdUZGMDlcbiAgICBpZiAoZW50cnkuc2VydmljZVRhZ3MgJiYgZW50cnkuc2VydmljZVRhZ3MubGVuZ3RoID4gMCkge1xuICAgICAgZm9yIChjb25zdCB0YWcgb2YgZW50cnkuc2VydmljZVRhZ3MpIHtcbiAgICAgICAgY29uc3Qga2V5ID0gZ2V0VGFnS2V5KHRhZylcbiAgICAgICAgY29uc3QgaW5mbzogVGFnSW5mbyA9IHtcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdGFnLFxuICAgICAgICAgIG93bmVyTW9kdWxlSWQ6IG93bmVySWQsXG4gICAgICAgICAgc291cmNlOiBcInNlcnZpY2VcIlxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nSW5mb3MgPSBpbmRleC5nZXQoa2V5KVxuICAgICAgICBpZiAoZXhpc3RpbmdJbmZvcykge1xuICAgICAgICAgIGV4aXN0aW5nSW5mb3MucHVzaChpbmZvKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGluZGV4LnNldChrZXksIFtpbmZvXSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBpbmRleFxufVxuXG5jb25zdCB2YWxpZGF0ZVRhZ3MgPSAoZW50cmllczogUmVhZG9ubHlBcnJheTxBcHBNb2R1bGVFbnRyeT4pOiB2b2lkID0+IHtcbiAgY29uc3QgaW5kZXggPSBidWlsZFRhZ0luZGV4KGVudHJpZXMpXG4gIGNvbnN0IGNvbGxpc2lvbnM6IFRhZ0NvbGxpc2lvbltdID0gW11cblxuICBmb3IgKGNvbnN0IFtrZXksIGluZm9zXSBvZiBpbmRleCkge1xuICAgIGlmIChpbmZvcy5sZW5ndGggPD0gMSkge1xuICAgICAgY29udGludWVcbiAgICB9XG4gICAgY29uc3Qgb3duZXJzID0gbmV3IFNldDxzdHJpbmc+KClcbiAgICBmb3IgKGNvbnN0IGluZm8gb2YgaW5mb3MpIHtcbiAgICAgIG93bmVycy5hZGQoaW5mby5vd25lck1vZHVsZUlkKVxuICAgIH1cbiAgICAvLyBcdTRFQzVcdTVGNTNcdTU0MENcdTRFMDAga2V5IFx1NTFGQVx1NzNCMFx1NTcyOFx1NTkxQVx1NEUyQVx1NEUwRFx1NTQwQ1x1NkEyMVx1NTc1N1x1NEUwQlx1NjVGNlx1ODlDNlx1NEUzQVx1NTFCMlx1N0E4MVx1RkYxQlxuICAgIC8vIFx1NTM1NVx1NkEyMVx1NTc1N1x1NTE4NVx1OTFDRFx1NTkwRFx1NzY3Qlx1OEJCMFx1NTQwQ1x1NEUwMCBUYWcgXHU0RTBEXHU0RjVDXHU0RTNBXHU5NTE5XHU4QkVGXHU1OTA0XHU3NDA2XHVGRjA4XHU1M0VGXHU4MEZEXHU2NzY1XHU4MUVBXHU1OTFBXHU1QzQyXHU3RUM0XHU1NDA4XHVGRjA5XHUzMDAyXG4gICAgaWYgKG93bmVycy5zaXplID4gMSkge1xuICAgICAgY29sbGlzaW9ucy5wdXNoKHsga2V5LCBjb25mbGljdHM6IGluZm9zIH0pXG4gICAgfVxuICB9XG5cbiAgaWYgKGNvbGxpc2lvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBjb25zdCBtZXNzYWdlID1cbiAgICBcIltMb2dpeF0gVGFnIGNvbGxpc2lvbiBkZXRlY3RlZDpcXG5cIiArXG4gICAgY29sbGlzaW9uc1xuICAgICAgLm1hcCgoYykgPT4ge1xuICAgICAgICBjb25zdCBoZWFkZXIgPSBgLSBrZXk6ICR7Yy5rZXl9YFxuICAgICAgICBjb25zdCBsaW5lcyA9IGMuY29uZmxpY3RzLm1hcChcbiAgICAgICAgICAoaSkgPT4gYCAgLSBvd25lcjogJHtpLm93bmVyTW9kdWxlSWR9LCBzb3VyY2U6ICR7aS5zb3VyY2V9YFxuICAgICAgICApXG4gICAgICAgIHJldHVybiBbaGVhZGVyLCAuLi5saW5lc10uam9pbihcIlxcblwiKVxuICAgICAgfSlcbiAgICAgIC5qb2luKFwiXFxuXCIpXG5cbiAgY29uc3QgZXJyb3I6IFRhZ0NvbGxpc2lvbkVycm9yID0gT2JqZWN0LmFzc2lnbihuZXcgRXJyb3IobWVzc2FnZSksIHtcbiAgICBfdGFnOiBcIlRhZ0NvbGxpc2lvbkVycm9yXCIgYXMgY29uc3QsXG4gICAgY29sbGlzaW9uc1xuICB9KVxuXG4gIHRocm93IGVycm9yXG59XG5cbmV4cG9ydCBjb25zdCBtYWtlQXBwID0gPFI+KGNvbmZpZzogTG9naXhBcHBDb25maWc8Uj4pOiBBcHBEZWZpbml0aW9uPFI+ID0+IHtcbiAgY29uc3Qgc2VlbklkcyA9IG5ldyBTZXQ8c3RyaW5nPigpXG4gIGZvciAoY29uc3QgZW50cnkgb2YgY29uZmlnLm1vZHVsZXMpIHtcbiAgICBjb25zdCBpZCA9IFN0cmluZyhlbnRyeS5tb2R1bGUuaWQpXG5cbiAgICBpZiAoc2Vlbklkcy5oYXMoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBbTG9naXhdIER1cGxpY2F0ZSBNb2R1bGUgSUQvVGFnIGRldGVjdGVkOiBcIiR7aWR9XCIuIFxcbkVuc3VyZSBhbGwgbW9kdWxlcyBpbiB0aGUgYXBwbGljYXRpb24gUnVudGltZSBoYXZlIHVuaXF1ZSBJRHMuYFxuICAgICAgKVxuICAgIH1cbiAgICBzZWVuSWRzLmFkZChpZClcbiAgfVxuXG4gIC8vIFx1NTcyOFx1NTQwOFx1NUU3NiBMYXllciBcdTRFNEJcdTUyNERcdUZGMENcdTVCRjkgTW9kdWxlIFRhZyBcdTRFMEVcdTY2M0VcdTVGMEZcdTYzRDBcdTRGOUJcdTc2ODQgU2VydmljZSBUYWcgXHU1MDVBXHU0RTAwXHU2QjIxXHU1MUIyXHU3QTgxXHU2ODIxXHU5QThDXHUzMDAyXG4gIC8vIFx1OEZEOVx1NTNFRlx1NEVFNVx1NjNEMFx1NTI0RFx1NjZCNFx1OTczMlx1MjAxQ1x1NTQwQ1x1NEUwMCBTZXJ2aWNlVGFnIFx1NzUzMVx1NTkxQVx1NEUyQVx1NkEyMVx1NTc1N1x1NUI5RVx1NzNCMFx1MjAxRFx1NzY4NFx1OTVFRVx1OTg5OFx1RkYwQ1x1OTA3Rlx1NTE0RCBFbnYgXHU4OEFCXHU5NzU5XHU5RUQ4XHU4OTg2XHU3NkQ2XHUzMDAyXG4gIHZhbGlkYXRlVGFncyhjb25maWcubW9kdWxlcylcblxuICBjb25zdCBtb2R1bGVMYXllcnMgPSBjb25maWcubW9kdWxlcy5tYXAoKGVudHJ5KSA9PlxuICAgIC8vIFx1Nzg2RVx1NEZERFx1NkJDRlx1NEUyQVx1NkEyMVx1NTc1N1x1NUM0Mlx1OTBGRFx1ODBGRFx1NzcwQlx1NTIzMCBBcHAgXHU3RUE3IEVudlx1RkYwOGNvbmZpZy5sYXllclx1RkYwOVx1RkYwQ1x1OTA3Rlx1NTE0RFx1NTcyOFx1NTIxRFx1NTlDQlx1NTMxNlx1OTYzNlx1NkJCNVx1NjI3RVx1NEUwRFx1NTIzMCBSb290IEVudlx1MzAwMlxuICAgIExheWVyLnByb3ZpZGUoZW50cnkubGF5ZXIsIGNvbmZpZy5sYXllcilcbiAgKVxuICBjb25zdCBlbnZMYXllciA9IG1vZHVsZUxheWVycy5sZW5ndGggPiAwXG4gICAgPyBMYXllci5tZXJnZUFsbChjb25maWcubGF5ZXIsIC4uLm1vZHVsZUxheWVycylcbiAgICA6IGNvbmZpZy5sYXllclxuXG4gIGNvbnN0IGZpbmFsTGF5ZXIgPSBMYXllci51bndyYXBTY29wZWQoXG4gICAgRWZmZWN0LmdlbihmdW5jdGlvbiogKCkge1xuICAgICAgY29uc3Qgc2NvcGUgPSB5aWVsZCogRWZmZWN0LnNjb3BlXG4gICAgICBjb25zdCBlbnYgPSB5aWVsZCogTGF5ZXIuYnVpbGRXaXRoU2NvcGUoZW52TGF5ZXIsIHNjb3BlKVxuXG4gICAgICB5aWVsZCogRWZmZWN0LmZvckVhY2goY29uZmlnLnByb2Nlc3NlcywgKHByb2Nlc3MpID0+XG4gICAgICAgIEVmZmVjdC5mb3JrU2NvcGVkKFxuICAgICAgICAgIEVmZmVjdC5wcm92aWRlKFxuICAgICAgICAgICAgY29uZmlnLm9uRXJyb3JcbiAgICAgICAgICAgICAgPyBFZmZlY3QuY2F0Y2hBbGxDYXVzZShwcm9jZXNzLCBjb25maWcub25FcnJvcilcbiAgICAgICAgICAgICAgOiBwcm9jZXNzLFxuICAgICAgICAgICAgZW52XG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICApXG5cbiAgICAgIHJldHVybiBMYXllci5zdWNjZWVkQ29udGV4dChlbnYpXG4gICAgfSlcbiAgKSBhcyBMYXllci5MYXllcjxSLCBuZXZlciwgbmV2ZXI+XG5cbiAgcmV0dXJuIHtcbiAgICBkZWZpbml0aW9uOiBjb25maWcsXG4gICAgbGF5ZXI6IGZpbmFsTGF5ZXIsXG4gICAgbWFrZVJ1bnRpbWU6ICgpID0+IE1hbmFnZWRSdW50aW1lLm1ha2UoZmluYWxMYXllciksXG4gIH1cbn1cblxuLyoqXG4gKiBcdThCRURcdTZDRDVcdTdDRDZcdUZGMUFcdTVDMDYgTW9kdWxlIFx1NEUwRSBSdW50aW1lIFx1NUI5RVx1NEY4Qlx1NjIxNiBMYXllciBcdTkxNERcdTVCRjlcdUZGMENcdTc1MjhcdTRFOEUgQXBwUnVudGltZSBcdTc2ODQgbW9kdWxlcyBcdTkxNERcdTdGNkVcdTMwMDJcbiAqL1xuZXhwb3J0IGNvbnN0IHByb3ZpZGUgPSA8U2ggZXh0ZW5kcyBBbnlNb2R1bGVTaGFwZSwgUiwgRT4oXG4gIG1vZHVsZTogTW9kdWxlSW5zdGFuY2U8YW55LCBTaD4sXG4gIHJlc291cmNlOlxuICAgIHwgTGF5ZXIuTGF5ZXI8TW9kdWxlUnVudGltZTxTdGF0ZU9mPFNoPiwgQWN0aW9uT2Y8U2g+PiwgRSwgUj5cbiAgICB8IE1vZHVsZVJ1bnRpbWU8U3RhdGVPZjxTaD4sIEFjdGlvbk9mPFNoPj5cbik6IEFwcE1vZHVsZUVudHJ5ID0+IHtcbiAgY29uc3QgbGF5ZXIgPSBpc0xheWVyKHJlc291cmNlKVxuICAgID8gcmVzb3VyY2VcbiAgICA6IExheWVyLnN1Y2NlZWQoXG4gICAgICAgIG1vZHVsZSxcbiAgICAgICAgcmVzb3VyY2UgYXMgTW9kdWxlUnVudGltZTxTdGF0ZU9mPFNoPiwgQWN0aW9uT2Y8U2g+PlxuICAgICAgKVxuXG4gIHJldHVybiB7IG1vZHVsZSwgbGF5ZXIgfVxufVxuXG4vKipcbiAqIFx1OEJFRFx1NkNENVx1N0NENlx1RkYxQVx1NTcyOCBBcHAgXHU2QTIxXHU1NzU3XHU2NzYxXHU3NkVFXHU0RTBBXHU5NjQ0XHU1MkEwXHU2NjNFXHU1RjBGIFNlcnZpY2UgVGFnIFx1NTE0M1x1NEZFMVx1NjA2Rlx1RkYwQ1x1NzUyOFx1NEU4RSBUYWcgXHU1MUIyXHU3QTgxXHU2OEMwXHU2RDRCXHUzMDAyXG4gKlxuICogLSBzZXJ2aWNlVGFncyBcdTVFOTRcdTRFQzVcdTUzMDVcdTU0MkJcdTIwMUNcdTc1MzFcdThCRTVcdTZBMjFcdTU3NTdcdTVCRjlcdTVFOTQgTGF5ZXIgXHU2M0QwXHU0RjlCXHU1QjlFXHU3M0IwXHUyMDFEXHU3Njg0IFNlcnZpY2VcdUZGMUJcbiAqIC0gXHU5MDFBXHU4RkM3IExvZ2l4LnByb3ZpZGVXaXRoVGFncyBcdTY2QjRcdTk3MzJcdTdFRDlcdTRFMUFcdTUyQTFcdTRFRTNcdTc4MDFcdUZGMENcdTU3MjggQXBwIFx1Njc4NFx1NUVGQVx1OTYzNlx1NkJCNVx1NjNEMFx1NTI0RFx1NTNEMVx1NzNCMCBUYWcgS2V5IFx1NTFCMlx1N0E4MVx1MzAwMlxuICovXG5leHBvcnQgY29uc3QgcHJvdmlkZVdpdGhUYWdzID0gPFNoIGV4dGVuZHMgQW55TW9kdWxlU2hhcGUsIFIsIEU+KFxuICBtb2R1bGU6IE1vZHVsZUluc3RhbmNlPGFueSwgU2g+LFxuICByZXNvdXJjZTpcbiAgICB8IExheWVyLkxheWVyPE1vZHVsZVJ1bnRpbWU8U3RhdGVPZjxTaD4sIEFjdGlvbk9mPFNoPj4sIEUsIFI+XG4gICAgfCBNb2R1bGVSdW50aW1lPFN0YXRlT2Y8U2g+LCBBY3Rpb25PZjxTaD4+LFxuICBzZXJ2aWNlVGFnczogUmVhZG9ubHlBcnJheTxDb250ZXh0LlRhZzxhbnksIGFueT4+XG4pOiBBcHBNb2R1bGVFbnRyeSA9PiB7XG4gIGNvbnN0IGJhc2UgPSBwcm92aWRlKG1vZHVsZSwgcmVzb3VyY2UpXG4gIHJldHVybiB7XG4gICAgLi4uYmFzZSxcbiAgICBzZXJ2aWNlVGFnc1xuICB9XG59XG5cbmNvbnN0IGlzTGF5ZXIgPSAoXG4gIHZhbHVlOiB1bmtub3duXG4pOiB2YWx1ZSBpcyBMYXllci5MYXllcjxhbnksIGFueSwgYW55PiA9PlxuICB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdmFsdWUgIT09IG51bGwgJiYgTGF5ZXIuTGF5ZXJUeXBlSWQgaW4gdmFsdWVcbiIsICJpbXBvcnQgeyBFZmZlY3QsIExheWVyLCBMb2dnZXIgfSBmcm9tIFwiZWZmZWN0XCJcbmltcG9ydCAqIGFzIEludGVybmFsIGZyb20gXCIuL2ludGVybmFsL2RlYnVnL0RlYnVnU2luay5qc1wiXG5cbi8vIFB1YmxpYyBEZWJ1ZyBBUElcdUZGMUFcdTRFRTVcdTU0N0RcdTU0MERcdTdBN0FcdTk1RjRcdTVGNjJcdTVGMEZcdTY1MzZcdTUzRTMgRGVidWcgXHU4MEZEXHU1MjlCXHVGRjBDXHU0RjlCXHU0RTFBXHU1MkExXHU0RTBFXHU1RTczXHU1M0YwXHU3RURGXHU0RTAwXHU0RjdGXHU3NTI4XHUzMDAyXG4vLyBcdTVCOUVcdTk2NDVcdTRFOEJcdTRFRjZcdTZBMjFcdTU3OEJcdTRFMEUgVGFnL0xheWVyIFx1NUI5QVx1NEU0OVx1OTZDNlx1NEUyRFx1NTcyOCBpbnRlcm5hbC9kZWJ1Zy9EZWJ1Z1NpbmsudHMgXHU0RTJEXHVGRjBDXG4vLyBcdThGRDlcdTkxQ0NcdTU3MjhcdTUxNzZcdTU3RkFcdTc4NDBcdTRFMEFcdTYzRDBcdTRGOUJcdTY2RjRcdTY2MTNcdTc1MjhcdTc2ODRcdTdFQzRcdTU0MDhcdTUxNjVcdTUzRTNcdTMwMDJcblxuZXhwb3J0IHR5cGUgRXZlbnQgPSBJbnRlcm5hbC5FdmVudFxuZXhwb3J0IGludGVyZmFjZSBTaW5rIGV4dGVuZHMgSW50ZXJuYWwuU2luayB7fVxuXG5leHBvcnQgY29uc3QgaW50ZXJuYWwgPSB7XG4gIGN1cnJlbnREZWJ1Z1NpbmtzOiBJbnRlcm5hbC5jdXJyZW50RGVidWdTaW5rcyxcbiAgY3VycmVudFJ1bnRpbWVMYWJlbDogSW50ZXJuYWwuY3VycmVudFJ1bnRpbWVMYWJlbCxcbn1cblxuLyoqXG4gKiBNb2R1bGVJbnN0YW5jZUNvdW50ZXJcdUZGMUFcbiAqIC0gXHU0RUM1XHU0RjlEXHU4RDU2IG1vZHVsZTppbml0IC8gbW9kdWxlOmRlc3Ryb3kgXHU0RThCXHU0RUY2XHVGRjBDXHU2MzA5IG1vZHVsZUlkIFx1N0VGNFx1NUVBNlx1N0VERlx1OEJBMVx1NUY1M1x1NTI0RFx1NkQzQlx1OERDM1x1NUI5RVx1NEY4Qlx1NjU3MFx1OTFDRlx1RkYxQlxuICogLSBcdTkwMDJcdTU0MDhcdTRGNUNcdTRFM0EgRGV2VG9vbHMgLyBQbGF5Z3JvdW5kIFx1NzY4NFx1NTdGQVx1Nzg0MFx1NjU3MFx1NjM2RVx1NkU5MFx1RkYwQ1x1NEUwRFx1NTE3M1x1NUZDM1x1NTE3N1x1NEY1MyBydW50aW1lSWQgXHU2MjE2IFJlYWN0IGtleVx1MzAwMlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZUluc3RhbmNlQ291bnRlciB7XG4gIHJlYWRvbmx5IHNpbms6IFNpbmtcbiAgcmVhZG9ubHkgZ2V0U25hcHNob3Q6ICgpID0+IFJlYWRvbmx5TWFwPHN0cmluZywgbnVtYmVyPlxufVxuXG4vKipcbiAqIFJpbmdCdWZmZXJTaW5rXHVGRjFBXG4gKiAtIFx1OTAxQVx1NzUyOCBEZXZUb29scyBcdThGODVcdTUyQTlcdTVERTVcdTUxNzdcdUZGMENcdTc1MjhcdTRFOEVcdTU3MjhcdTUxODVcdTVCNThcdTRFMkRcdTRGRERcdTc1NTlcdTY3MDBcdThGRDFcdTRFMDBcdTZCQjUgRGVidWcgXHU0RThCXHU0RUY2XHU3QTk3XHU1M0UzXHVGRjA4XHU3M0FGXHU1RjYyXHU3RjEzXHU1MUIyXHU1MzNBXHVGRjA5XHVGRjFCXG4gKiAtIFx1NEUwRFx1NTA1QVx1NEVGQlx1NEY1NVx1N0I1Qlx1OTAwOS9cdTUyMDZcdTdFQzRcdUZGMENcdThDMDNcdTc1MjhcdTY1QjlcdTUzRUZcdTRFRTVcdTU3RkFcdTRFOEUgc25hcHNob3QgXHU1MThEXHU2MzA5IG1vZHVsZUlkIC8gdHlwZSBcdTdCNDlcdTdFRjRcdTVFQTZcdTUyQTBcdTVERTVcdTMwMDJcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSaW5nQnVmZmVyU2luayB7XG4gIHJlYWRvbmx5IHNpbms6IFNpbmtcbiAgcmVhZG9ubHkgZ2V0U25hcHNob3Q6ICgpID0+IFJlYWRvbmx5QXJyYXk8RXZlbnQ+XG4gIHJlYWRvbmx5IGNsZWFyOiAoKSA9PiB2b2lkXG59XG5cbi8qKlxuICogbWFrZU1vZHVsZUluc3RhbmNlQ291bnRlclNpbmtcdUZGMUFcbiAqIC0gXHU2Nzg0XHU5MDIwXHU0RTAwXHU0RTJBIERlYnVnU2lua1x1RkYwQ1x1NzUyOFx1NEU4RVx1NTcyOFx1NTE4NVx1NUI1OFx1NEUyRFx1N0QyRlx1NzlFRlx1MzAwQ1x1NkJDRlx1NEUyQSBtb2R1bGVJZCBcdTVGNTNcdTUyNERcdTY3MDlcdTU5MUFcdTVDMTFcdTZEM0JcdThEQzNcdTVCOUVcdTRGOEJcdTMwMERcdUZGMUJcbiAqIC0gU25hcHNob3QgXHU5MDFBXHU4RkM3IGdldFNuYXBzaG90KCkgXHU2NkI0XHU5NzMyXHU3RUQ5IERldlRvb2xzXHVGRjBDXHU4QzAzXHU3NTI4XHU2NUI5XHU1M0VGXHU4MUVBXHU4ODRDXHU1MUIzXHU1QjlBXHU1OTgyXHU0RjU1XHU1QkY5XHU1OTE2XHU2ODY1XHU2M0E1XHVGRjA4d2luZG93L3Bvc3RNZXNzYWdlIFx1N0I0OVx1RkYwOVx1MzAwMlxuICovXG5leHBvcnQgY29uc3QgbWFrZU1vZHVsZUluc3RhbmNlQ291bnRlclNpbmsgPSAoKTogTW9kdWxlSW5zdGFuY2VDb3VudGVyID0+IHtcbiAgY29uc3QgY291bnRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKVxuXG4gIGNvbnN0IHNpbms6IFNpbmsgPSB7XG4gICAgcmVjb3JkOiAoZXZlbnQ6IEV2ZW50KSA9PlxuICAgICAgRWZmZWN0LnN5bmMoKCkgPT4ge1xuICAgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gXCJtb2R1bGU6aW5pdFwiKSB7XG4gICAgICAgICAgY29uc3QgbW9kdWxlSWQgPSBldmVudC5tb2R1bGVJZCA/PyBcInVua25vd25cIlxuICAgICAgICAgIGNvbnN0IHJ1bnRpbWVMYWJlbCA9XG4gICAgICAgICAgICBcInJ1bnRpbWVMYWJlbFwiIGluIGV2ZW50ICYmIGV2ZW50LnJ1bnRpbWVMYWJlbFxuICAgICAgICAgICAgICA/IGV2ZW50LnJ1bnRpbWVMYWJlbFxuICAgICAgICAgICAgICA6IFwidW5rbm93blwiXG4gICAgICAgICAgY29uc3Qga2V5ID0gYCR7cnVudGltZUxhYmVsfTo6JHttb2R1bGVJZH1gXG4gICAgICAgICAgY29uc3QgcHJldiA9IGNvdW50cy5nZXQoa2V5KSA/PyAwXG4gICAgICAgICAgY291bnRzLnNldChrZXksIHByZXYgKyAxKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGlmIChldmVudC50eXBlID09PSBcIm1vZHVsZTpkZXN0cm95XCIpIHtcbiAgICAgICAgICBjb25zdCBtb2R1bGVJZCA9IGV2ZW50Lm1vZHVsZUlkID8/IFwidW5rbm93blwiXG4gICAgICAgICAgY29uc3QgcnVudGltZUxhYmVsID1cbiAgICAgICAgICAgIFwicnVudGltZUxhYmVsXCIgaW4gZXZlbnQgJiYgZXZlbnQucnVudGltZUxhYmVsXG4gICAgICAgICAgICAgID8gZXZlbnQucnVudGltZUxhYmVsXG4gICAgICAgICAgICAgIDogXCJ1bmtub3duXCJcbiAgICAgICAgICBjb25zdCBrZXkgPSBgJHtydW50aW1lTGFiZWx9Ojoke21vZHVsZUlkfWBcbiAgICAgICAgICBjb25zdCBwcmV2ID0gY291bnRzLmdldChrZXkpID8/IDBcbiAgICAgICAgICBjb25zdCBuZXh0ID0gcHJldiAtIDFcbiAgICAgICAgICBpZiAobmV4dCA8PSAwKSB7XG4gICAgICAgICAgICBjb3VudHMuZGVsZXRlKGtleSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY291bnRzLnNldChrZXksIG5leHQpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KSxcbiAgfVxuXG4gIGNvbnN0IGdldFNuYXBzaG90ID0gKCk6IFJlYWRvbmx5TWFwPHN0cmluZywgbnVtYmVyPiA9PlxuICAgIG5ldyBNYXAoY291bnRzKVxuXG4gIHJldHVybiB7IHNpbmssIGdldFNuYXBzaG90IH1cbn1cblxuLyoqXG4gKiBtYWtlUmluZ0J1ZmZlclNpbmtcdUZGMUFcbiAqIC0gXHU1MjFCXHU1RUZBXHU0RTAwXHU0RTJBXHU3QjgwXHU1MzU1XHU3Njg0XHU3M0FGXHU1RjYyXHU3RjEzXHU1MUIyXHU1MzNBIERlYnVnU2lua1x1RkYwQ1x1NjMwOVx1NjVGNlx1OTVGNFx1OTg3QVx1NUU4Rlx1OEJCMFx1NUY1NVx1NjcwMFx1OEZEMSBjYXBhY2l0eSBcdTY3NjFcdTRFOEJcdTRFRjZcdUZGMUJcbiAqIC0gXHU5MDAyXHU1NDA4XHU0RjVDXHU0RTNBIERldlRvb2xzIC8gUGxheWdyb3VuZCBcdTc2ODRcdTIwMUNcdTRFOEJcdTRFRjZcdTY1RjZcdTk1RjRcdTdFQkZcdTIwMURcdTU3RkFcdTc4NDBcdTVCOUVcdTczQjBcdTMwMDJcbiAqL1xuZXhwb3J0IGNvbnN0IG1ha2VSaW5nQnVmZmVyU2luayA9IChjYXBhY2l0eSA9IDEwMDApOiBSaW5nQnVmZmVyU2luayA9PiB7XG4gIGNvbnN0IGJ1ZmZlcjogRXZlbnRbXSA9IFtdXG5cbiAgY29uc3Qgc2luazogU2luayA9IHtcbiAgICByZWNvcmQ6IChldmVudDogRXZlbnQpID0+XG4gICAgICBFZmZlY3Quc3luYygoKSA9PiB7XG4gICAgICAgIGlmIChjYXBhY2l0eSA8PSAwKSB7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJ1ZmZlci5sZW5ndGggPj0gY2FwYWNpdHkpIHtcbiAgICAgICAgICBidWZmZXIuc2hpZnQoKVxuICAgICAgICB9XG4gICAgICAgIGJ1ZmZlci5wdXNoKGV2ZW50KVxuICAgICAgfSksXG4gIH1cblxuICBjb25zdCBnZXRTbmFwc2hvdCA9ICgpOiBSZWFkb25seUFycmF5PEV2ZW50PiA9PiBidWZmZXIuc2xpY2UoKVxuICBjb25zdCBjbGVhciA9ICgpOiB2b2lkID0+IHtcbiAgICBidWZmZXIubGVuZ3RoID0gMFxuICB9XG5cbiAgcmV0dXJuIHsgc2luaywgZ2V0U25hcHNob3QsIGNsZWFyIH1cbn1cblxuLyoqXG4gKiBEZWJ1Zy5yZWNvcmRcdUZGMUFcbiAqIC0gXHU1NDExXHU1RjUzXHU1MjREIEZpYmVyIFx1NEUwQVx1NjMwMlx1OEY3RFx1NzY4NCBEZWJ1ZyBzaW5rcyBcdTUzRDFcdTUxRkFcdTRFMDBcdTY3NjFcdTRFOEJcdTRFRjZcdUZGMUJcbiAqIC0gXHU4MkU1XHU1RjUzXHU1MjREIEZpYmVyIFx1NEUwQVx1NjcyQVx1NjNEMFx1NEY5Qlx1NEVGQlx1NEY1NSBzaW5rXHVGRjBDXHU1MjE5XHU2ODM5XHU2MzZFXHU4RkQwXHU4ODRDXHU3M0FGXHU1ODgzXHU5MDA5XHU2MkU5XHU1MTVDXHU1RTk1XHU4ODRDXHU0RTNBXG4gKiAgIFx1RkYwOFx1NkQ0Rlx1ODlDOFx1NTY2OFx1OEQ3MFx1NUY2OVx1ODI3MiBjb25zb2xlIFx1NTIwNlx1N0VDNFx1RkYwQ05vZGUgXHU1M0VBXHU0RkREXHU4QkMxXHU5NTE5XHU4QkVGXHU3QzdCXHU0RThCXHU0RUY2XHU0RTBEXHU0RjFBXHU1QjhDXHU1MTY4XHU0RTIyXHU1OTMxXHVGRjA5XHUzMDAyXG4gKi9cbmV4cG9ydCBjb25zdCByZWNvcmQgPSBJbnRlcm5hbC5yZWNvcmRcblxuLyoqXG4gKiBub29wTGF5ZXJcdUZGMUFcbiAqIC0gXHU2M0QwXHU0RjlCXHU0RTAwXHU0RTJBXHUyMDFDXHU3QTdBIERlYnVnU2luayBcdTk2QzZcdTU0MDhcdTIwMURcdUZGMDhcdTUxODVcdTkwRThcdTY1RTBcdTRFRkJcdTRGNTUgU2lua1x1RkYwOVx1RkYwQ1x1NzZGNFx1NjNBNVx1NEUyMlx1NUYwM1x1NjI0MFx1NjcwOSBEZWJ1ZyBcdTRFOEJcdTRFRjZcdUZGMUJcbiAqIC0gXHU0RTNCXHU4OTgxXHU3NTI4XHU0RThFXHU2RDRCXHU4QkQ1XHU1NzNBXHU2NjZGXHU2MjE2XHU2NjNFXHU1RjBGXHU1MTczXHU5NUVEIERlYnVnIFx1ODBGRFx1NTI5Qlx1MzAwMlxuICovXG5leHBvcnQgY29uc3Qgbm9vcExheWVyID0gSW50ZXJuYWwubm9vcExheWVyIGFzIHVua25vd24gYXMgTGF5ZXIuTGF5ZXI8YW55LCBuZXZlciwgbmV2ZXI+XG5cbi8qKlxuICogRGVidWdNb2RlXHVGRjFBXG4gKiAtIFwiYXV0b1wiXHVGRjFBXHU2ODM5XHU2MzZFIE5PREVfRU5WIFx1ODFFQVx1NTJBOFx1OTAwOVx1NjJFOSBkZXYgLyBwcm9kXHVGRjFCXG4gKiAtIFwiZGV2XCJcdUZGMUFcdTVGMDBcdTUzRDFcdTZBMjFcdTVGMEZcdUZGMENcdThGOTNcdTUxRkFcdTVDM0RcdTkxQ0ZcdTRFMzBcdTVCQ0NcdTc2ODRcdThCQ0FcdTY1QURcdTRGRTFcdTYwNkZcdUZGMUJcbiAqIC0gXCJwcm9kXCJcdUZGMUFcdTc1MUZcdTRFQTdcdTZBMjFcdTVGMEZcdUZGMENcdTUzRUFcdTRGRERcdTc1NTlcdTUxNzNcdTk1MkVcdTk1MTlcdThCRUZcdTRFMEVcdThCQ0FcdTY1QURcdUZGMUJcbiAqIC0gXCJvZmZcIlx1RkYxQVx1NUI4Q1x1NTE2OFx1NTE3M1x1OTVFRCBEZWJ1Z1NpbmtcdUZGMDhcdTkwMUFcdTVFMzhcdTc1MjhcdTRFOEVcdTU3RkFcdTUxQzYvXHU3Mjc5XHU2QjhBXHU2RDRCXHU4QkQ1XHU1NzNBXHU2NjZGXHVGRjA5XHUzMDAyXG4gKi9cbmV4cG9ydCB0eXBlIERlYnVnTW9kZSA9IFwiYXV0b1wiIHwgXCJkZXZcIiB8IFwicHJvZFwiIHwgXCJvZmZcIlxuXG5leHBvcnQgaW50ZXJmYWNlIERlYnVnTGF5ZXJPcHRpb25zIHtcbiAgcmVhZG9ubHkgbW9kZT86IERlYnVnTW9kZVxuICAvKipcbiAgICogXHU0RTNBXHU2NzJBXHU2NzY1XHU2MjY5XHU1QzU1XHU5ODg0XHU3NTU5XHVGRjFBXHU1NzI4IGRldiBcdTZBMjFcdTVGMEZcdTRFMEJcdTY2MkZcdTU0MjZcdTYyNTNcdTVGMDBcdTlBRDhcdTU2NkFcdTk3RjNcdTc2ODQgYWN0aW9uL3N0YXRlIFx1N0VBN1x1NTIyQlx1NjVFNVx1NUZEN1x1MzAwMlxuICAgKiBcdTVGNTNcdTUyNERcdTVCOUVcdTczQjBcdTRFMkRcdTVDMUFcdTY3MkFcdTRGN0ZcdTc1MjhcdTMwMDJcbiAgICovXG4gIHJlYWRvbmx5IHZlcmJvc2VBY3Rpb25zPzogYm9vbGVhblxuICAvKipcbiAgICogXHU0RTNBXHU2NzJBXHU2NzY1XHU2MjY5XHU1QzU1XHU5ODg0XHU3NTU5XHVGRjFBXHU1NzI4IHByb2QgXHU2QTIxXHU1RjBGXHU0RTBCXHU2NjJGXHU1NDI2XHU1QzA2XHU1MTczXHU5NTJFXHU0RThCXHU0RUY2XHU2MjUzXHU1MTY1IG1ldHJpY3NcdTMwMDJcbiAgICogXHU1RjUzXHU1MjREXHU1QjlFXHU3M0IwXHU0RTJEXHU1QzFBXHU2NzJBXHU0RjdGXHU3NTI4XHUzMDAyXG4gICAqL1xuICByZWFkb25seSBlbmFibGVNZXRyaWNzPzogYm9vbGVhblxufVxuXG5jb25zdCByZXNvbHZlTW9kZSA9IChtb2RlOiBEZWJ1Z01vZGUgfCB1bmRlZmluZWQpOiBEZWJ1Z01vZGUgPT4ge1xuICBpZiAobW9kZSAmJiBtb2RlICE9PSBcImF1dG9cIikge1xuICAgIHJldHVybiBtb2RlXG4gIH1cblxuICB0cnkge1xuICAgIGlmIChcbiAgICAgIHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICBwcm9jZXNzICE9IG51bGwgJiZcbiAgICAgIHR5cGVvZiBwcm9jZXNzLmVudiAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgcHJvY2Vzcy5lbnY/Lk5PREVfRU5WID09PSBcInByb2R1Y3Rpb25cIlxuICAgICkge1xuICAgICAgcmV0dXJuIFwicHJvZFwiXG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBpZ25vcmUgZW52IHByb2JpbmcgZmFpbHVyZXMgYW5kIGZhbGwgYmFjayB0byBkZXZcbiAgfVxuXG4gIHJldHVybiBcImRldlwiXG59XG5cbi8qKlxuICogRGVidWcubGF5ZXJcdUZGMUFcbiAqIC0gXHU1QkY5XHU1OTE2XHU3RURGXHU0RTAwXHU1MTY1XHU1M0UzXHVGRjBDXHU2ODM5XHU2MzZFXHU1RjUzXHU1MjREXHU3M0FGXHU1ODgzXHU2MjE2XHU2NjNFXHU1RjBGXHU0RjIwXHU1MTY1XHU3Njg0IG1vZGUgXHU3RUM0XHU1NDA4XHU0RTAwXHU1OTU3IERlYnVnIFx1ODBGRFx1NTI5Qlx1RkYxQlxuICogLSBcdTlFRDhcdThCQTQgYG1vZGU6IFwiYXV0b1wiYFx1RkYxQVx1OTc1RSBwcm9kdWN0aW9uIFx1ODlDNlx1NEUzQSBkZXZcdUZGMENwcm9kdWN0aW9uIFx1ODlDNlx1NEUzQSBwcm9kXHUzMDAyXG4gKlxuICogXHU1MTc4XHU1NzhCXHU3NTI4XHU2Q0Q1XHVGRjFBXG4gKlxuICogICBjb25zdCBydW50aW1lID0gUnVudGltZS5tYWtlKEFwcEltcGwsIHtcbiAqICAgICBsYXllcjogTGF5ZXIubWVyZ2VBbGwoXG4gKiAgICAgICBEZWJ1Zy5sYXllcigpLFxuICogICAgICAgYnVzaW5lc3NMYXllcixcbiAqICAgICApLFxuICogICB9KVxuICovXG5leHBvcnQgY29uc3QgbGF5ZXIgPSAob3B0aW9ucz86IERlYnVnTGF5ZXJPcHRpb25zKTogTGF5ZXIuTGF5ZXI8YW55LCBuZXZlciwgbmV2ZXI+ID0+IHtcbiAgY29uc3QgbW9kZSA9IHJlc29sdmVNb2RlKG9wdGlvbnM/Lm1vZGUpXG5cbiAgc3dpdGNoIChtb2RlKSB7XG4gICAgY2FzZSBcIm9mZlwiOlxuICAgICAgcmV0dXJuIEludGVybmFsLm5vb3BMYXllciBhcyB1bmtub3duIGFzIExheWVyLkxheWVyPGFueSwgbmV2ZXIsIG5ldmVyPlxuICAgIGNhc2UgXCJwcm9kXCI6XG4gICAgICAvLyBcdTc1MUZcdTRFQTdcdTczQUZcdTU4ODNcdUZGMUFcdTRFQzVcdTRGRERcdTc1NTlcdTUxNzNcdTk1MkVcdTk1MTlcdThCRUZcdTRFMEVcdTlBRDhcdTRFRjdcdTUwM0NcdThCQ0FcdTY1QURcdUZGMENcdTkwN0ZcdTUxNERcdTlBRDhcdTU2NkFcdTk3RjNcdTY1RTVcdTVGRDdcdTMwMDJcbiAgICAgIHJldHVybiBJbnRlcm5hbC5lcnJvck9ubHlMYXllciBhcyB1bmtub3duIGFzIExheWVyLkxheWVyPGFueSwgbmV2ZXIsIG5ldmVyPlxuICAgIGNhc2UgXCJkZXZcIjpcbiAgICBjYXNlIFwiYXV0b1wiOiB7XG4gICAgICAvLyBcdTVGMDBcdTUzRDFcdTczQUZcdTU4ODNcdUZGMUFcdTlFRDhcdThCQTRcdTRFQzVcdTU0MkZcdTc1MjggRGVidWcgU2luayBcdTc2ODRcdTZENEZcdTg5QzhcdTU2NjhcdTUzQ0JcdTU5N0RcdThGOTNcdTUxRkFcdUZGMENcbiAgICAgIC8vIExvZ2dlci5wcmV0dHkgXHU3NTMxXHU4QzAzXHU3NTI4XHU2NUI5XHU4MUVBXHU4ODRDXHU5MDA5XHU2MkU5XHU2NjJGXHU1NDI2XHU1M0UwXHU1MkEwXHVGRjBDXHU5MDdGXHU1MTREXHU5NjkwXHU1RjBGXHU2NTM5XHU1MTk5IGxvZ2dlclx1MzAwMlxuICAgICAgcmV0dXJuIEludGVybmFsLmJyb3dzZXJDb25zb2xlTGF5ZXIgYXMgdW5rbm93biBhcyBMYXllci5MYXllcjxhbnksIG5ldmVyLCBuZXZlcj5cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBQcmV0dHlMb2dnZXJPcHRpb25zXHVGRjFBXHU3NkY0XHU2M0E1XHU1OTBEXHU3NTI4IEVmZmVjdC5Mb2dnZXIucHJldHR5TG9nZ2VyIFx1NzY4NFx1NTNDMlx1NjU3MFx1NUY2Mlx1NzJCNlx1MzAwMlxuICovXG5leHBvcnQgdHlwZSBQcmV0dHlMb2dnZXJPcHRpb25zID0gUGFyYW1ldGVyczx0eXBlb2YgTG9nZ2VyLnByZXR0eUxvZ2dlcj5bMF1cblxuLyoqXG4gKiB3aXRoUHJldHR5TG9nZ2VyXHVGRjFBXG4gKiAtIFx1NTcyOFx1N0VEOVx1NUI5QSBMYXllciBcdTU3RkFcdTc4NDBcdTRFMEFcdUZGMENcdTY2RkZcdTYzNjIgRWZmZWN0IFx1OUVEOFx1OEJBNCBsb2dnZXIgXHU0RTNBIHByZXR0eSBsb2dnZXJcdUZGMUJcbiAqIC0gXHU3QjQ5XHU0RUY3XHU0RThFIExvZ2dlci5yZXBsYWNlKExvZ2dlci5kZWZhdWx0TG9nZ2VyLCBMb2dnZXIucHJldHR5TG9nZ2VyKG9wdGlvbnMpKVx1RkYwQ1xuICogICBcdTRFRTUgTGF5ZXIgXHU1RjYyXHU1RjBGXHU2NkI0XHU5NzMyXHVGRjBDXHU0RkJGXHU0RThFXHU0RTBFIERlYnVnLmxheWVyIC8gXHU0RTFBXHU1MkExIExheWVyIFx1N0VDNFx1NTQwOFx1MzAwMlxuICovXG5leHBvcnQgY29uc3Qgd2l0aFByZXR0eUxvZ2dlciA9IChcbiAgYmFzZTogTGF5ZXIuTGF5ZXI8YW55LCBhbnksIGFueT4sXG4gIG9wdGlvbnM/OiBQcmV0dHlMb2dnZXJPcHRpb25zXG4pOiBMYXllci5MYXllcjxhbnksIGFueSwgYW55PiA9PlxuICBMYXllci5tZXJnZShcbiAgICBiYXNlLFxuICAgIExvZ2dlci5yZXBsYWNlKFxuICAgICAgTG9nZ2VyLmRlZmF1bHRMb2dnZXIsXG4gICAgICBMb2dnZXIucHJldHR5TG9nZ2VyKG9wdGlvbnMpXG4gICAgKSBhcyB1bmtub3duIGFzIExheWVyLkxheWVyPGFueSwgYW55LCBhbnk+XG4gIClcblxuLyoqXG4gKiByZXBsYWNlXHVGRjFBXG4gKiAtIFx1OUFEOFx1N0VBN1x1NzUyOFx1NkNENVx1RkYxQVx1NUI4Q1x1NTE2OFx1NEY3Rlx1NzUyOFx1OEMwM1x1NzUyOFx1NjVCOVx1NjNEMFx1NEY5Qlx1NzY4NCBTaW5rIExheWVyIFx1NjNBNVx1N0JBMSBEZWJ1ZyBcdTgwRkRcdTUyOUJcdUZGMUJcbiAqIC0gXHU5MDFBXHU1RTM4XHU5MTREXHU1NDA4IERlYnVnLm1ha2VTaW5rIC8gXHU4MUVBXHU1QjlBXHU0RTQ5IFNpbmsgXHU0RjdGXHU3NTI4XHVGRjFCXG4gKiAtIFx1NEUwRSBEZWJ1Zy5sYXllciBcdTRFOTJcdTY1QTVcdUZGMUFcdTU0MENcdTRFMDBcdTRGNUNcdTc1MjhcdTU3REZcdTUxODVcdTVFRkFcdThCQUVcdTRFOENcdTkwMDlcdTRFMDBcdTMwMDJcbiAqL1xuZXhwb3J0IGNvbnN0IHJlcGxhY2UgPSAoc2lua3M6IFJlYWRvbmx5QXJyYXk8U2luaz4pOiBMYXllci5MYXllcjxhbnksIG5ldmVyLCBuZXZlcj4gPT5cbiAgTGF5ZXIubG9jYWxseVNjb3BlZChcbiAgICBpbnRlcm5hbC5jdXJyZW50RGVidWdTaW5rcyxcbiAgICBzaW5rcyBhcyBSZWFkb25seUFycmF5PEludGVybmFsLlNpbms+LFxuICApIGFzIExheWVyLkxheWVyPGFueSwgbmV2ZXIsIG5ldmVyPlxuXG4vKipcbiAqIHJ1bnRpbWVMYWJlbFx1RkYxQVxuICogLSBcdTU3MjhcdTVGNTNcdTUyNEQgRmliZXIgXHU0RjVDXHU3NTI4XHU1N0RGXHU1MTg1XHU0RTNBIERlYnVnIFx1NEU4Qlx1NEVGNlx1OTY0NFx1NTJBMFx1NEUwMFx1NEUyQVx1OTAzQlx1OEY5MSBSdW50aW1lIFx1NjgwN1x1OEJDNlx1RkYwOFx1NTk4MiBBcHAgXHU1NDBEXHU3OUYwIC8gXHU1NzNBXHU2NjZGXHU2ODA3XHU3QjdFXHVGRjA5XHVGRjFCXG4gKiAtIERldlRvb2xzIFx1NTNFRlx1NEVFNVx1NjM2RVx1NkI2NFx1NUMwNiBEZWJ1ZyBcdTRFOEJcdTRFRjZcdTYzMDkgUnVudGltZSBcdTUyMDZcdTdFQzRcdTVDNTVcdTc5M0FcdTMwMDJcbiAqL1xuZXhwb3J0IGNvbnN0IHJ1bnRpbWVMYWJlbCA9IChsYWJlbDogc3RyaW5nKTogTGF5ZXIuTGF5ZXI8YW55LCBuZXZlciwgbmV2ZXI+ID0+XG4gIExheWVyLmZpYmVyUmVmTG9jYWxseVNjb3BlZFdpdGgoXG4gICAgaW50ZXJuYWwuY3VycmVudFJ1bnRpbWVMYWJlbCBhcyBhbnksXG4gICAgKCkgPT4gbGFiZWwsXG4gICkgYXMgTGF5ZXIuTGF5ZXI8YW55LCBuZXZlciwgbmV2ZXI+XG5cbi8qKlxuICogdHJhY2VMYXllclx1RkYxQVxuICogLSBcdTRGNUNcdTRFM0FcdTg4QzVcdTk5NzBcdTU2NjhcdTU3MjhcdTVGNTNcdTUyNEQgRmliZXIgXHU3Njg0IERlYnVnIHNpbmtzIFx1OTZDNlx1NTQwOFx1NTdGQVx1Nzg0MFx1NEUwQVx1OEZGRFx1NTJBMFx1NEUwMFx1NEUyQVx1NEVDNVx1NTkwNFx1NzQwNiBgdHJhY2U6KmAgXHU3Njg0IFNpbmtcdUZGMUJcbiAqIC0gXHU5RUQ4XHU4QkE0XHU4ODRDXHU0RTNBXHU2NjJGXHU1QzA2IHRyYWNlIFx1NEU4Qlx1NEVGNlx1NEVFNSBEZWJ1ZyBcdTY1RTVcdTVGRDdcdThGOTNcdTUxRkFcdUZGMDhsb2dEZWJ1Z1x1RkYwOVx1RkYwQ1xuICogICBcdThDMDNcdTc1MjhcdTY1QjlcdTUzRUZcdTRFRTVcdTkwMUFcdThGQzdcdTRGMjBcdTUxNjVcdTgxRUFcdTVCOUFcdTRFNDkgaGFuZGxlciBcdTVDMDYgdHJhY2UgXHU0RThCXHU0RUY2XHU1MTk5XHU1MTY1IHJpbmcgYnVmZmVyIC8gRGV2VG9vbHNCcmlkZ2UgXHU3QjQ5XHVGRjFCXG4gKiAtIFx1NkI2M1x1Nzg2RVx1NzUyOFx1NkNENVx1NzkzQVx1NEY4Qlx1RkYxQVxuICpcbiAqICAgY29uc3QgbGF5ZXIgPSBEZWJ1Zy50cmFjZUxheWVyKFxuICogICAgIERlYnVnLmxheWVyKHsgbW9kZTogXCJkZXZcIiB9KSxcbiAqICAgICAoZXZlbnQpID0+IEVmZmVjdC5sb2dJbmZvKHsgdHJhY2VFdmVudDogZXZlbnQgfSksXG4gKiAgIClcbiAqL1xuY29uc3QgaXNMYXllciA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIExheWVyLkxheWVyPGFueSwgYW55LCBhbnk+ID0+XG4gIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPT0gbnVsbCAmJiBcIl90YWdcIiBpbiAodmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pXG5cbmV4cG9ydCBmdW5jdGlvbiB0cmFjZUxheWVyKFxuICBvblRyYWNlPzogKGV2ZW50OiBFdmVudCkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkPixcbik6IExheWVyLkxheWVyPGFueSwgbmV2ZXIsIG5ldmVyPlxuZXhwb3J0IGZ1bmN0aW9uIHRyYWNlTGF5ZXIoXG4gIGJhc2U6IExheWVyLkxheWVyPGFueSwgYW55LCBhbnk+LFxuICBvblRyYWNlPzogKGV2ZW50OiBFdmVudCkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkPixcbik6IExheWVyLkxheWVyPGFueSwgbmV2ZXIsIGFueT5cbmV4cG9ydCBmdW5jdGlvbiB0cmFjZUxheWVyKFxuICBiYXNlT3JIYW5kbGVyPzogTGF5ZXIuTGF5ZXI8YW55LCBhbnksIGFueT4gfCAoKGV2ZW50OiBFdmVudCkgPT4gRWZmZWN0LkVmZmVjdDx2b2lkPiksXG4gIG1heWJlT25UcmFjZT86IChldmVudDogRXZlbnQpID0+IEVmZmVjdC5FZmZlY3Q8dm9pZD4sXG4pOiBMYXllci5MYXllcjxhbnksIG5ldmVyLCBhbnk+IHtcbiAgY29uc3QgaGFzQmFzZSA9IGlzTGF5ZXIoYmFzZU9ySGFuZGxlcilcbiAgY29uc3QgYmFzZSA9IGhhc0Jhc2VcbiAgICA/IChiYXNlT3JIYW5kbGVyIGFzIExheWVyLkxheWVyPGFueSwgYW55LCBhbnk+KVxuICAgIDogKExheWVyLmVtcHR5IGFzIHVua25vd24gYXMgTGF5ZXIuTGF5ZXI8YW55LCBhbnksIGFueT4pXG4gIGNvbnN0IG9uVHJhY2UgPSBoYXNCYXNlID8gbWF5YmVPblRyYWNlIDogKGJhc2VPckhhbmRsZXIgYXMgKChldmVudDogRXZlbnQpID0+IEVmZmVjdC5FZmZlY3Q8dm9pZD4pIHwgdW5kZWZpbmVkKVxuXG4gIGNvbnN0IHRyYWNlU2luazogU2luayA9IHtcbiAgICByZWNvcmQ6IChldmVudDogRXZlbnQpID0+XG4gICAgICB0eXBlb2YgZXZlbnQudHlwZSA9PT0gXCJzdHJpbmdcIiAmJiBldmVudC50eXBlLnN0YXJ0c1dpdGgoXCJ0cmFjZTpcIilcbiAgICAgICAgPyAob25UcmFjZSA/IG9uVHJhY2UoZXZlbnQpIDogRWZmZWN0LmxvZ0RlYnVnKHsgdHJhY2VFdmVudDogZXZlbnQgfSkpXG4gICAgICAgIDogRWZmZWN0LnZvaWQsXG4gIH1cblxuICAvLyBcdTkwMUFcdThGQzcgRmliZXJSZWYgXHU4RkZEXHU1MkEwIHRyYWNlIHNpbmtcdUZGMUFcdTU3MjhcdTVGNTNcdTUyNEQgRmliZXIgXHU3Njg0IHNpbmtzIFx1OTZDNlx1NTQwOFx1NTdGQVx1Nzg0MFx1NEUwQVx1OEZGRFx1NTJBMFx1RkYwQ1xuICAvLyBcdTRFMERcdTUxOERcdTRGOURcdThENTZcdTRFRkJcdTRGNTUgRGVidWdIdWIgLyBUYWdcdUZGMENcdTUzRUFcdTRGN0ZcdTc1MjggRmliZXJSZWYuY3VycmVudERlYnVnU2lua3MgXHU0RjVDXHU0RTNBXHU1MzU1XHU0RTAwXHU3NzFGXHU3NkY4XHUzMDAyXG4gIGNvbnN0IGFwcGVuZFRyYWNlID0gTGF5ZXIuZmliZXJSZWZMb2NhbGx5U2NvcGVkV2l0aChcbiAgICBJbnRlcm5hbC5jdXJyZW50RGVidWdTaW5rcyxcbiAgICAoc2lua3MpID0+IFsuLi5zaW5rcywgdHJhY2VTaW5rXSxcbiAgKVxuXG4gIHJldHVybiBMYXllci5tZXJnZShiYXNlIGFzIExheWVyLkxheWVyPGFueSwgYW55LCBhbnk+LCBhcHBlbmRUcmFjZSkgYXMgTGF5ZXIuTGF5ZXI8YW55LCBuZXZlciwgYW55PlxufVxuIiwgImltcG9ydCB7IEVmZmVjdCwgTGF5ZXIgfSBmcm9tIFwiZWZmZWN0XCJcbmltcG9ydCAqIGFzIEludGVybmFsIGZyb20gXCIuL2ludGVybmFsL3BsYXRmb3JtL1BsYXRmb3JtLmpzXCJcblxuLyoqXG4gKiBQbGF0Zm9ybS5TZXJ2aWNlXHVGRjFBXHU1RTczXHU1M0YwXHU2NzBEXHU1MkExXHU2M0E1XHU1M0UzXHUzMDAyXG4gKi9cbmV4cG9ydCB0eXBlIFNlcnZpY2UgPSBJbnRlcm5hbC5TZXJ2aWNlXG5cbi8qKlxuICogUGxhdGZvcm0udGFnXHVGRjFBXHU1RTczXHU1M0YwXHU2NzBEXHU1MkExIFRhZ1x1MzAwMlxuICovXG5leHBvcnQgY29uc3QgdGFnID0gSW50ZXJuYWwuVGFnXG5cbi8qKlxuICogTm9vcFBsYXRmb3JtXHVGRjFBXG4gKiAtIFx1NjgzOFx1NUZDM1x1NUYxNVx1NjRDRVx1OUVEOFx1OEJBNFx1NTNFQVx1NTE4NVx1N0Y2RVx1NEUwMFx1NEUyQVx1MzAwQ1x1NEVDMFx1NEU0OFx1OTBGRFx1NEUwRFx1NTA1QVx1MzAwRFx1NzY4NFx1NUU3M1x1NTNGMFx1NUI5RVx1NzNCMFx1RkYxQlxuICogLSBSZWFjdCAvIE5hdGl2ZSBcdTdCNDlcdTUxNzdcdTRGNTNcdTVFNzNcdTUzRjBcdTU3MjhcdTU0MDRcdTgxRUFcdTkwMDJcdTkxNERcdTVDNDJcdTRFMkRcdTYzRDBcdTRGOUJcdTc3MUZcdTZCNjNcdTc2ODRcdTVCOUVcdTczQjBcdTMwMDJcbiAqL1xuZXhwb3J0IGNsYXNzIE5vb3BQbGF0Zm9ybSBpbXBsZW1lbnRzIFNlcnZpY2Uge1xuICByZWFkb25seSBsaWZlY3ljbGUgPSB7XG4gICAgb25TdXNwZW5kOiAoX2VmZjogRWZmZWN0LkVmZmVjdDx2b2lkLCBuZXZlciwgYW55PikgPT4gRWZmZWN0LnZvaWQsXG4gICAgb25SZXN1bWU6IChfZWZmOiBFZmZlY3QuRWZmZWN0PHZvaWQsIG5ldmVyLCBhbnk+KSA9PiBFZmZlY3Qudm9pZCxcbiAgICBvblJlc2V0OiAoX2VmZjogRWZmZWN0LkVmZmVjdDx2b2lkLCBuZXZlciwgYW55PikgPT4gRWZmZWN0LnZvaWQsXG4gIH1cbn1cblxuLyoqXG4gKiBOb29wUGxhdGZvcm1MYXllclx1RkYxQVxuICogLSBcdTVDMDYgTm9vcFBsYXRmb3JtIFx1NUI5RVx1NzNCMFx1NjMwMlx1OEY3RFx1NTIzMCBQbGF0Zm9ybS50YWcgXHU0RTBBXHVGRjFCXG4gKiAtIFx1NEY1Q1x1NEUzQSBAbG9naXgvY29yZSBcdTUxRkFcdTUzODJcdTlFRDhcdThCQTQgTGF5ZXJcdUZGMENcdTVCOUVcdTk2NDVcdTVFOTRcdTc1MjhcdTkwMUFcdTVFMzhcdTRGMUFcdTU3MjhcdTY2RjRcdTU5MTZcdTVDNDJcdTc1MjhcdTc3MUZcdTVCOUVcdTVFNzNcdTUzRjBcdTVCOUVcdTczQjBcdTg5ODZcdTc2RDZcdTVCODNcdTMwMDJcbiAqL1xuZXhwb3J0IGNvbnN0IE5vb3BQbGF0Zm9ybUxheWVyID0gTGF5ZXIuc3VjY2VlZChcbiAgdGFnLFxuICBuZXcgTm9vcFBsYXRmb3JtKClcbilcblxuLyoqXG4gKiBkZWZhdWx0TGF5ZXJcdUZGMUFcbiAqIC0gXHU3NkVFXHU1MjREXHU3QjQ5XHU0RUY3XHU0RThFIE5vb3BQbGF0Zm9ybUxheWVyXHVGRjFCXG4gKiAtIFx1OTg4NFx1NzU1OVx1NjcyQVx1Njc2NVx1NTk4Mlx1OTcwMFx1NjZGNFx1NEUzMFx1NUJDQ1x1OUVEOFx1OEJBNFx1ODg0Q1x1NEUzQVx1NjVGNlx1NzY4NFx1NTM0N1x1N0VBN1x1N0E3QVx1OTVGNFx1RkYwOFx1OEMwM1x1NzUyOFx1NjVCOVx1N0VERlx1NEUwMFx1NEY3Rlx1NzUyOCBkZWZhdWx0TGF5ZXIgXHU1MzczXHU1M0VGXHVGRjA5XHUzMDAyXG4gKi9cbmV4cG9ydCBjb25zdCBkZWZhdWx0TGF5ZXIgPSBOb29wUGxhdGZvcm1MYXllclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBLGNBQUFBO0FBQUE7OztBQ1NPLElBQU0sWUFBWTtFQUN2QixRQUFRO0VBQ1IsU0FBUztFQUNULEtBQUs7O0FDWEEsSUFBTSxjQUFjLHVCQUFPLElBQUksMEJBQTBCO0FBQ3pELElBQU0sb0JBQW9CLHVCQUFPLGdDQUFnQztBQUVqRSxJQUFNLGlCQUF5QyxPQUFPO0FBRXRELElBQU0sWUFBWTtFQUN2QixTQUFTO0VBQ1QsV0FBVzs7QUNOTixJQUFNLFdBQVcsQ0FBQTtBQ0ZsQixTQUFVLElBQUksUUFBZ0IsS0FBZ0I7QUFDbEQsU0FBTyxrQkFBa0IsTUFDckIsT0FBTyxJQUFJLEdBQUcsSUFDZCxPQUFPLFVBQVUsZUFBZSxLQUFLLFFBQVEsR0FBRztBQUN0RDtBQUVNLFNBQVUsY0FBYyxRQUFnQixLQUFnQjtBQUM1RCxNQUFJLE9BQU8sUUFBUTtBQUNqQixRQUFJLFlBQVksUUFBUSxlQUFlLE1BQU07QUFDN0MsV0FBTyxXQUFXO0FBQ2hCLFlBQU0sYUFBYSxRQUFRLHlCQUF5QixXQUFXLEdBQUc7QUFDbEUsVUFBSTtBQUFZLGVBQU87QUFDdkIsa0JBQVksUUFBUSxlQUFlLFNBQVM7SUFDOUM7RUFD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QUMsb0JBQUE7QUFBQSxTQUFBQSxtQkFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUFTLFVBQUFDLFVBQVEsU0FBQUMsY0FBYTtBQVd2QixJQUFNLE1BQWU7QUFPckIsSUFBTSxlQUFOLE1BQXNDO0FBQUEsRUFBdEM7QUFDTCxTQUFTLFlBQVk7QUFBQSxNQUNuQixXQUFXLENBQUMsU0FBMENDLFNBQU87QUFBQSxNQUM3RCxVQUFVLENBQUMsU0FBMENBLFNBQU87QUFBQSxNQUM1RCxTQUFTLENBQUMsU0FBMENBLFNBQU87QUFBQSxJQUM3RDtBQUFBO0FBQ0Y7QUFPTyxJQUFNLG9CQUFvQkMsT0FBTTtBQUFBLEVBQ3JDO0FBQUEsRUFDQSxJQUFJLGFBQWE7QUFDbkI7QUFPTyxJQUFNLGVBQWU7IiwKICAibmFtZXMiOiBbIm1ha2UiLCAiaW5kZXgiLCAic2V0IiwgImdlbmVyYXRlUGF0Y2hlcyIsICJjdXJyZW50IiwgInZhbHVlIiwgInByb3h5RHJhZnQiLCAiZW5zdXJlU2hhbGxvd0NvcHkiLCAiY3JlYXRlIiwgImJhc2UiLCAiZHJhZnQiLCAibWFyayIsICJyZXN1bHQiLCAiQ29udGV4dCIsICJFZmZlY3QiLCAiTGF5ZXIiLCAiU2NoZW1hIiwgIkVmZmVjdCIsICJTdHJlYW0iLCAiU3Vic2NyaXB0aW9uUmVmIiwgIkNhdXNlIiwgIkNhdXNlIiwgIkVmZmVjdCIsICJFZmZlY3QiLCAicnVudGltZUxhYmVsIiwgIkNhdXNlIiwgIkVmZmVjdCIsICJ0YWciLCAiRWZmZWN0IiwgIkNhdXNlIiwgIkVmZmVjdCIsICJFZmZlY3QiLCAiaGFzIiwgIkNhdXNlIiwgIkNvbnRleHQiLCAiRWZmZWN0IiwgIkVmZmVjdCIsICJDYXVzZSIsICJDb250ZXh0IiwgIkNvbnRleHQiLCAiRWZmZWN0IiwgIlN0cmVhbSIsICJFZmZlY3QiLCAiUmVmIiwgIkVmZmVjdCIsICJDb250ZXh0IiwgIlN0cmVhbSIsICJFZmZlY3QiLCAibWFrZSIsICJ0YWciLCAiQ29udGV4dCIsICJydW50aW1lIiwgIl90YXJnZXQiLCAidGFnIiwgIm1ha2UiLCAiRWZmZWN0IiwgIlN1YnNjcmlwdGlvblJlZiIsICJTdHJlYW0iLCAiQ2F1c2UiLCAicnVuUGhhc2UiLCAiRWZmZWN0IiwgIlNjaGVtYSIsICJ0YWciLCAiQ29udGV4dCIsICJtYWtlIiwgIkxheWVyIiwgImxheWVyIiwgIm1ha2UiLCAiQ29udGV4dCIsICJDb250ZXh0IiwgIm1ha2UiLCAibWFrZSIsICJtYWtlIiwgIm1ha2UiLCAibWFrZSIsICJtYWtlIiwgIk1hdGNoQnVpbGRlcl9leHBvcnRzIiwgIm1ha2VNYXRjaCIsICJtYWtlTWF0Y2hUYWciLCAibWFrZU1hdGNoIiwgIm1ha2VNYXRjaFRhZyIsICJtYWtlIiwgIkxheWVyIiwgIkVmZmVjdCIsICJMYXllciIsICJ0YWciLCAicHJvY2VzcyIsICJsYXllciIsICJMYXllciIsICJpbnRlcm5hbCIsICJub29wTGF5ZXIiLCAicmVjb3JkIiwgIkVmZmVjdCIsICJMYXllciIsICJMb2dnZXIiLCAiaW50ZXJuYWwiLCAiRWZmZWN0IiwgInJ1bnRpbWVMYWJlbCIsICJyZWNvcmQiLCAibm9vcExheWVyIiwgIkxheWVyIiwgIkxvZ2dlciIsICJpc0xheWVyIiwgIm1ha2UiLCAiTGF5ZXIiLCAiUGxhdGZvcm1fZXhwb3J0cyIsICJFZmZlY3QiLCAiTGF5ZXIiLCAiRWZmZWN0IiwgIkxheWVyIl0KfQo=
