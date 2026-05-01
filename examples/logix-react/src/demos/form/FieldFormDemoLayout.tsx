// Example role: Selector and diagnostics adjunct
// Covers: SC-F
// Capability refs: CAP-13, CAP-17, CAP-18, CAP-24, CAP-25, CAP-26
// Proof refs: PF-07, PF-08
// SSoT: docs/ssot/form/06-capability-scenario-api-support-map.md

import React from "react";
import * as Logix from "@logixjs/core";
import type { Layer } from "effect";
import { RuntimeProvider, fieldValue, useModule, useSelector } from "@logixjs/react";
import {
  FieldForm,
  FieldFormProgram,
} from "../../modules/field-form.js";

// ToB 场景 1：表单脏标记由字段行为统一管理

const runtime = Logix.Runtime.make(FieldFormProgram, {
  label: "FieldFormDemoRuntime",
  devtools: true,
});

const FieldFormPanel: React.FC = () => {
  const form = useModule(FieldForm.tag);
  const formState = useSelector(form, fieldValue("form"));
  const baseline = useSelector(form, fieldValue("baseline"));
  const meta = useSelector(form, fieldValue("meta"));

  const handleChange =
    (field: "name" | "email") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (field === "name") {
        form.actions.changeName(value);
        return;
      }
      form.actions.changeEmail(value);
    };

  const handleReset = () => {
    form.actions.reset();
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            FieldForm · Advanced Field Behavior
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            基于 field computed，从 form / baseline 推导 dirtyCount /
            isDirty。
          </p>
        </div>
        <span className="px-2 py-1 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          Coverage · Field Behavior
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 text-sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formState.name}
              onChange={handleChange("name")}
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formState.email}
              onChange={handleChange("email")}
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            重置为 baseline
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Baseline
            </div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">
                  name:
                </span>
                <span className="text-gray-900 dark:text-gray-100">
                  {baseline.name || "''"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">
                  email:
                </span>
                <span className="text-gray-900 dark:text-gray-100">
                  {baseline.email || "''"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Field.Meta
            </div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">
                  dirtyCount:
                </span>
                <span className="text-blue-600 dark:text-blue-300">
                  {meta.dirtyCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 mr-1">
                  isDirty:
                </span>
                <span
                  className={
                    meta.isDirty
                      ? "text-amber-600 dark:text-amber-300"
                      : "text-gray-500 dark:text-gray-400"
                  }
                >
                  {String(meta.isDirty)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            FieldFormProgram 的图纸中，meta.* 字段完全由 field computed
            维护，业务逻辑只负责修改 form / baseline；Devtools 中可以通过
            FieldGraph + Timeline 观察这些字段是如何随用户输入变化的。
          </p>
        </div>
      </div>
    </div>
  );
};

export type FieldFormDemoLayoutProps = {
  readonly layer?: Layer.Layer<unknown, unknown, never>;
};

export const FieldFormDemoLayout: React.FC<FieldFormDemoLayoutProps> = ({
  layer,
}) => {
  return (
    <RuntimeProvider runtime={runtime} layer={layer} policy={{ mode: "defer" }}>
      <React.Suspense fallback={<div>FieldForm Program 加载中…</div>}>
        <FieldFormPanel />
      </React.Suspense>
    </RuntimeProvider>
  );
};
