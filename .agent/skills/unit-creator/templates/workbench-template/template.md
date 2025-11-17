---
id: imd-template-workbench
name: workbench-template
version: 1.0.0
description: 生成运营工作台模板的完整骨架（含页面、Blocks、Store、Service、Hooks 等）
tags: [imd, template, workbench, dashboard]
macros: {}
templates:
  - path: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/components.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/components.tsx
    lang: tsx
    template: |
      import type { ReactNode } from 'react'
      import type { UniqueIdentifier } from '@dnd-kit/core'
      
      import { cn } from '@/lib/utils'
      import { Button } from '@/registry/default/ui/pro-button'
      import {
        DialogCloseButton,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle,
      } from '@/registry/default/ui/ui-dialog'
      
      import { AddIcon, CloseIcon, DragIcon } from './icons'
      import { SortableList } from './sortable-list'
      import type { FieldColumn } from './types'
      
      export type FieldsetSlots = Record<string, string>
      
      interface FieldsetHeaderProps {
        title: ReactNode
        description?: ReactNode
        showCloseButton: boolean
        onClose: () => void
        slots: FieldsetSlots
      }
      
      export const FieldsetHeader: React.FC<FieldsetHeaderProps> = ({
        title,
        description,
        showCloseButton,
        onClose,
        slots,
      }) => (
        <DialogHeader className="gap-2 px-6 pt-6" data-ui-slot={slots.header}>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
          {showCloseButton ? <DialogCloseButton onClick={onClose} /> : null}
        </DialogHeader>
      )
      
      interface FieldsetFooterProps {
        footer: ReactNode | null | undefined
        confirmLabel: ReactNode
        cancelLabel: ReactNode
        isReadOnly: boolean
        confirmLoading: boolean
        disableConfirm: boolean
        onCancel: () => void
        onConfirm: () => void
        slots: FieldsetSlots
      }
      
      export const FieldsetFooter: React.FC<FieldsetFooterProps> = ({
        footer,
        confirmLabel,
        cancelLabel,
        isReadOnly,
        confirmLoading,
        disableConfirm,
        onCancel,
        onConfirm,
        slots,
      }) => {
        if (footer === null) return null
      
        return (
          <DialogFooter className={cn('px-6 py-4', slots.footer)}>
            {footer !== undefined ? (
              footer
            ) : (
              <>
                <Button color="secondary" disabled={isReadOnly} onClick={onCancel}>
                  {cancelLabel}
                </Button>
                <Button
                  disabled={disableConfirm}
                  loading={confirmLoading}
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </Button>
              </>
            )}
          </DialogFooter>
        )
      }
      
      interface SelectedFieldsSectionProps {
        label: ReactNode
        isLoading: boolean
        loadingLabel: ReactNode
        emptyLabel: ReactNode
        slots: FieldsetSlots
        items: FieldColumn[]
        itemIds: string[]
        disabledDragIds: Set<UniqueIdentifier>
        renderFieldLabel?: (column: FieldColumn) => ReactNode
        isReadOnly: boolean
        reorderLabel: string
        removeLabel: string
        onRemove: (dataIndex: string) => void
        onSwap: (activeId: UniqueIdentifier, overId: UniqueIdentifier) => void
      }
      
      export const SelectedFieldsSection: React.FC<SelectedFieldsSectionProps> = ({
        label,
        isLoading,
        loadingLabel,
        emptyLabel,
        slots,
        items,
        itemIds,
        disabledDragIds,
        renderFieldLabel,
        isReadOnly,
        reorderLabel,
        removeLabel,
        onRemove,
        onSwap,
      }) => (
        <section
          className="border-gray-3 bg-background overflow-hidden rounded-xl border"
          data-ui-slot={slots.section}
        >
          <div
            className="bg-gray-2 typography-body-small text-gray-13 flex h-10 items-center px-4"
            data-ui-slot={slots['section-title']}
          >
            {label}
          </div>
      
          <div
            className="max-h-[236px] min-h-[176px] overflow-y-auto p-3"
            data-ui-slot={slots['section-content']}
          >
            {isLoading ? (
              <div
                className={cn(
                  'text-gray-9 flex h-[150px] items-center justify-center text-sm',
                  slots.loading
                )}
              >
                {loadingLabel}
              </div>
            ) : itemIds.length === 0 ? (
              <div
                className={cn(
                  'text-gray-9 flex h-[150px] items-center justify-center text-sm',
                  slots.empty
                )}
              >
                {emptyLabel}
              </div>
            ) : (
              <SortableList
                disabledIds={disabledDragIds}
                items={itemIds}
                renderItem={({
                  id,
                  index,
                  disabled,
                  attributes,
                  listeners,
                  isDragging,
                }) => {
                  const column =
                    items[index] ?? items.find((item) => item.dataIndex === id)
                  if (!column) return null
                  const labelNode = renderFieldLabel
                    ? renderFieldLabel(column)
                    : column.title
      
                  const dragProps = disabled
                    ? undefined
                    : ({
                        ...attributes,
                        ...(listeners ?? {}),
                      } as Record<string, unknown>)
      
                  return (
                    <div
                      className={cn(
                        'bg-gray-2 text-gray-13 flex min-w-[130px] max-w-[240px] items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2 text-sm transition-colors',
                        disabled
                          ? 'cursor-default opacity-80'
                          : 'hover:bg-primary-1 cursor-grab active:cursor-grabbing',
                        isDragging &&
                          'border-primary-6 ring-primary-6 shadow-md ring-1'
                      )}
                      data-ui-slot={slots['selected-item']}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {!disabled && (
                          <button
                            aria-label={reorderLabel}
                            className={cn(
                              'text-gray-8 hover:text-primary-6 transition-colors focus-visible:outline-none',
                              slots['selected-item-handle']
                            )}
                            type="button"
                            {...(dragProps ?? {})}
                            disabled={isReadOnly}
                          >
                            <DragIcon className="size-4" />
                          </button>
                        )}
                        <span
                          className={cn(
                            'text-gray-13 line-clamp-1',
                            slots['selected-item-label']
                          )}
                        >
                          {labelNode}
                        </span>
                      </div>
                      {!disabled && (
                        <button
                          aria-label={removeLabel}
                          className={cn(
                            'text-gray-8 hover:text-primary-6 transition-colors focus-visible:outline-none',
                            slots['selected-item-action']
                          )}
                          disabled={isReadOnly}
                          type="button"
                          onClick={() => onRemove(String(id))}
                        >
                          <CloseIcon className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )
                }}
                onDragEnd={onSwap}
              />
            )}
          </div>
        </section>
      )
      
      interface UnselectedFieldsSectionProps {
        label: ReactNode
        isLoading: boolean
        loadingLabel: ReactNode
        emptyLabel: ReactNode
        items: FieldColumn[]
        slots: FieldsetSlots
        renderFieldLabel?: (column: FieldColumn) => ReactNode
        isReadOnly: boolean
        addLabel: string
        onAdd: (dataIndex: string) => void
      }
      
      export const UnselectedFieldsSection: React.FC<
        UnselectedFieldsSectionProps
      > = ({
        label,
        isLoading,
        loadingLabel,
        emptyLabel,
        items,
        slots,
        renderFieldLabel,
        isReadOnly,
        addLabel,
        onAdd,
      }) => (
        <section
          className="border-gray-3 bg-background overflow-hidden rounded-xl border"
          data-ui-slot={slots.section}
        >
          <div
            className="bg-gray-2 typography-body-small text-gray-13 flex h-10 items-center px-4"
            data-ui-slot={slots['section-title']}
          >
            {label}
          </div>
      
          <div
            className="max-h-[236px] min-h-[176px] overflow-y-auto p-3"
            data-ui-slot={slots['section-content']}
          >
            {isLoading ? (
              <div
                className={cn(
                  'text-gray-9 flex h-[150px] items-center justify-center text-sm',
                  slots.loading
                )}
              >
                {loadingLabel}
              </div>
            ) : items.length === 0 ? (
              <div
                className={cn(
                  'text-gray-9 flex h-[150px] items-center justify-center text-sm',
                  slots.empty
                )}
              >
                {emptyLabel}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {items.map((column) => {
                  const labelNode = renderFieldLabel
                    ? renderFieldLabel(column)
                    : column.title
                  return (
                    <div
                      key={column.dataIndex}
                      className="bg-gray-1 text-gray-13 flex min-w-[130px] max-w-[240px] items-center justify-between gap-2 rounded-md px-3 py-2 text-sm"
                      data-ui-slot={slots['unselected-item']}
                    >
                      <span className="line-clamp-1">{labelNode}</span>
                      <button
                        aria-label={addLabel}
                        className={cn(
                          'text-primary-6 hover:text-primary transition-colors focus-visible:outline-none',
                          slots['unselected-item-action']
                        )}
                        disabled={isReadOnly}
                        type="button"
                        onClick={() => onAdd(column.dataIndex)}
                      >
                        <AddIcon className="size-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/hooks.ts
    out: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/hooks.ts
    lang: ts
    template: |
      import { useCallback, useEffect, useMemo, useState } from 'react'
      import type { UniqueIdentifier } from '@dnd-kit/core'
      import { arrayMove } from '@dnd-kit/sortable'
      import { useControllableState } from '@radix-ui/react-use-controllable-state'
      
      import { useQuery, useQueryClient } from '@/registry/default/lib/query'
      
      import type {
        CloseReason,
        FieldColumn,
        FieldState,
        RemoteFieldColumn,
      } from './types'
      import {
        buildFieldState,
        cloneColumns,
        composeFinalFieldList,
        defaultLoadRemoteColumns,
        defaultSaveRemoteColumns,
      } from './utils'
      
      export interface UseProFieldsetColumnsOptions {
        columns: FieldColumn[]
        tableName?: string
        loadRemoteColumns?: (
          tableName: string
        ) => Promise<RemoteFieldColumn[] | undefined>
        enabled?: boolean
      }
      
      export interface UseProFieldsetColumnsResult {
        columns: FieldColumn[]
        selected: FieldColumn[]
        unselected: FieldColumn[]
        loading: boolean
        error: unknown
        refresh: () => Promise<unknown>
        updateColumns: (nextColumns: FieldColumn[]) => void
      }
      
      const areColumnsEqual = (a: FieldColumn[], b: FieldColumn[]) => {
        if (a === b) return true
        if (a.length !== b.length) return false
        for (let index = 0; index < a.length; index += 1) {
          const left = a[index]
          const right = b[index]
          if (!left || !right) return false
          const keys = new Set([...Object.keys(left), ...Object.keys(right)])
          for (const key of keys) {
            if (left[key] !== right[key]) {
              return false
            }
          }
        }
        return true
      }
      
      export const useProFieldsetColumns = ({
        columns,
        tableName = '',
        loadRemoteColumns,
        enabled = true,
      }: UseProFieldsetColumnsOptions): UseProFieldsetColumnsResult => {
        const shouldUseDefaultRemote =
          enabled && Boolean(tableName) && !loadRemoteColumns
      
        const remoteLoader = useMemo(() => {
          if (!enabled) return undefined
          if (loadRemoteColumns) return loadRemoteColumns
          if (shouldUseDefaultRemote) return defaultLoadRemoteColumns
          return undefined
        }, [enabled, loadRemoteColumns, shouldUseDefaultRemote])
      
        const remoteQueryEnabled = Boolean(remoteLoader) && Boolean(tableName)
      
        const {
          data: remoteColumnsData = [],
          isLoading: remoteLoadingState,
          isFetching: remoteFetching,
          isError: remoteError,
          error: remoteErrorInstance,
          refetch,
        } = useQuery<RemoteFieldColumn[]>({
          queryKey: ['ProFieldsetDialog', tableName],
          queryFn: async () => {
            if (!remoteLoader) return []
            const result = await remoteLoader(tableName)
            return result ?? []
          },
          enabled: remoteQueryEnabled,
          onError: (error) => {
            console.error('[ProFieldsetDialog] loadRemoteColumns failed', error)
          },
        })
      
        const derivedState = useMemo(() => {
          if (remoteQueryEnabled && !remoteError && remoteColumnsData.length) {
            return buildFieldState({
              columns,
              remoteColumns: remoteColumnsData,
            })
          }
          return buildFieldState({ columns })
        }, [columns, remoteColumnsData, remoteError, remoteQueryEnabled])
      
        const derivedColumns = useMemo(
          () => composeFinalFieldList(derivedState.selected, derivedState.unselected),
          [derivedState]
        )
      
        const [currentColumns, setCurrentColumns] = useState<FieldColumn[]>(() =>
          cloneColumns(derivedColumns)
        )
      
        useEffect(() => {
          setCurrentColumns((prev) =>
            areColumnsEqual(prev, derivedColumns)
              ? prev
              : cloneColumns(derivedColumns)
          )
        }, [derivedColumns])
      
        const updateColumns = useCallback((nextColumns: FieldColumn[]) => {
          setCurrentColumns(cloneColumns(nextColumns))
        }, [])
      
        const selected = useMemo(
          () => currentColumns.filter((column) => column.isDisplay !== false),
          [currentColumns]
        )
      
        const unselected = useMemo(
          () => currentColumns.filter((column) => column.isDisplay === false),
          [currentColumns]
        )
      
        return {
          columns: currentColumns,
          selected,
          unselected,
          loading: remoteQueryEnabled ? remoteLoadingState || remoteFetching : false,
          error: remoteError ? remoteErrorInstance : null,
          refresh: () => refetch(),
          updateColumns,
        }
      }
      
      interface UseFieldsetControllerOptions {
        columns: FieldColumn[]
        initialState: FieldState
        openProp: boolean | undefined
        defaultOpen: boolean | undefined
        onOpenChange?: (open: boolean) => void
        tableName: string
        loadRemoteColumns?: (
          tableName: string
        ) => Promise<RemoteFieldColumn[] | undefined>
        nonRemovableSet: Set<string>
        pinnedSet: Set<string>
        onCancel?: (reason: CloseReason) => void | boolean | Promise<void | boolean>
        onSave?: (columns: FieldColumn[]) => void | boolean | Promise<void | boolean>
        onConfirm?: (
          selected: FieldColumn[]
        ) => void | boolean | Promise<void | boolean>
      }
      
      export function useFieldsetController({
        columns,
        initialState,
        openProp,
        defaultOpen,
        onOpenChange,
        tableName,
        loadRemoteColumns,
        onCancel,
        onSave,
        onConfirm,
        nonRemovableSet,
        pinnedSet,
      }: UseFieldsetControllerOptions) {
        const shouldUseDefaultRemote = Boolean(tableName) && !loadRemoteColumns
      
        const queryClient = useQueryClient()
      
        const remoteLoader = useMemo(() => {
          if (loadRemoteColumns) return loadRemoteColumns
          if (shouldUseDefaultRemote) return defaultLoadRemoteColumns
          return undefined
        }, [loadRemoteColumns, shouldUseDefaultRemote])
      
        const persistRemote = useCallback(
          (fieldList: FieldColumn[]) => {
            if (!shouldUseDefaultRemote) return Promise.resolve(true)
            return defaultSaveRemoteColumns(tableName, fieldList)
          },
          [shouldUseDefaultRemote, tableName]
        )
      
        const [selected, setSelected] = useState<FieldColumn[]>(() =>
          cloneColumns(initialState.selected)
        )
        const [unselected, setUnselected] = useState<FieldColumn[]>(() =>
          cloneColumns(initialState.unselected)
        )
        const [saving, setSaving] = useState(false)
      
        const [open, setOpen] = useControllableState({
          prop: openProp,
          defaultProp: defaultOpen ?? false,
          onChange: onOpenChange,
        })
      
        const remoteQueryEnabled =
          Boolean(remoteLoader) && Boolean(tableName) && open === true
      
        const {
          data: remoteColumnsData = [],
          isLoading: remoteLoadingState,
          isFetching: remoteFetching,
          isError: remoteError,
        } = useQuery<RemoteFieldColumn[]>({
          queryKey: ['ProFieldsetDialog', tableName],
          queryFn: async () => {
            if (!remoteLoader) return []
            const result = await remoteLoader(tableName)
            return result ?? []
          },
          enabled: remoteQueryEnabled,
          onError: (error) => {
            console.error('[ProFieldsetDialog] loadRemoteColumns failed', error)
          },
        })
      
        useEffect(() => {
          if (open) return
          setSelected(cloneColumns(initialState.selected))
          setUnselected(cloneColumns(initialState.unselected))
        }, [initialState, open])
      
        useEffect(() => {
          if (!open) return
      
          if (!remoteLoader) {
            setSelected(cloneColumns(initialState.selected))
            setUnselected(cloneColumns(initialState.unselected))
            return
          }
      
          if (remoteLoadingState || remoteFetching) return
      
          if (remoteError || !remoteColumnsData?.length) {
            setSelected(cloneColumns(initialState.selected))
            setUnselected(cloneColumns(initialState.unselected))
            return
          }
      
          const next = buildFieldState({
            columns,
            remoteColumns: remoteColumnsData ?? [],
          })
          setSelected(cloneColumns(next.selected))
          setUnselected(cloneColumns(next.unselected))
        }, [
          columns,
          initialState,
          open,
          remoteColumnsData,
          remoteError,
          remoteFetching,
          remoteLoader,
          remoteLoadingState,
        ])
      
        const loading =
          open && remoteLoader ? remoteLoadingState || remoteFetching : false
      
        const requestClose = useCallback(
          async (reason: CloseReason) => {
            if (saving) return false
            const result = await onCancel?.(reason)
            if (result === false) return false
            setOpen(false)
            return true
          },
          [onCancel, saving, setOpen]
        )
      
        const handleRootOpenChange = useCallback(
          (nextOpen: boolean) => {
            if (nextOpen) {
              setOpen(true)
              return
            }
            void requestClose('dismiss')
          },
          [requestClose, setOpen]
        )
      
        const handleSelect = useCallback(
          (dataIndex: string) => {
            if (saving || loading) return
            setUnselected((prev) => {
              const index = prev.findIndex((item) => item.dataIndex === dataIndex)
              if (index === -1) return prev
              const item = { ...prev[index], isDisplay: true }
              setSelected((current) => {
                if (current.some((column) => column.dataIndex === item.dataIndex)) {
                  return current
                }
                return [...current, item]
              })
              return prev.filter((_, idx) => idx !== index)
            })
          },
          [loading, saving]
        )
      
        const handleUnselect = useCallback(
          (dataIndex: string) => {
            if (saving || loading || nonRemovableSet.has(dataIndex)) return
            setSelected((prev) => {
              const index = prev.findIndex((item) => item.dataIndex === dataIndex)
              if (index === -1) return prev
              const item = { ...prev[index], isDisplay: false }
              setUnselected((current) => [...current, item])
              return prev.filter((_, idx) => idx !== index)
            })
          },
          [loading, saving]
        )
      
        const handleSwap = useCallback(
          (activeId: UniqueIdentifier, overId: UniqueIdentifier) => {
            if (saving || loading) return
            const activeKey = String(activeId)
            const overKey = String(overId)
            if (pinnedSet.has(activeKey) || pinnedSet.has(overKey)) return
      
            setSelected((prev) => {
              const from = prev.findIndex((item) => item.dataIndex === activeKey)
              const to = prev.findIndex((item) => item.dataIndex === overKey)
              if (from === -1 || to === -1) return prev
              return arrayMove(prev, from, to)
            })
          },
          [loading, pinnedSet, saving]
        )
      
        const handleConfirm = useCallback(async () => {
          if (saving) return
          setSaving(true)
          try {
            const finalList = composeFinalFieldList(selected, unselected)
            const saveResult = await onSave?.(finalList)
            if (saveResult === false) return
      
            const remoteResult = await persistRemote(finalList)
            if (remoteResult === false) return
            queryClient.invalidateQueries({
              queryKey: ['ProFieldsetDialog', tableName],
            })
            const confirmResult = await onConfirm?.(
              selected.map((column) => ({ ...column, isDisplay: true }))
            )
      
            if (confirmResult === false) return
      
            setOpen(false)
          } catch (error) {
            console.error('[ProFieldsetDialog] handleConfirm failed', error)
          } finally {
            setSaving(false)
          }
        }, [
          saving,
          selected,
          unselected,
          onSave,
          persistRemote,
          onConfirm,
          queryClient,
          tableName,
          setOpen,
        ])
      
        return {
          open,
          selected,
          unselected,
          loading,
          saving,
          handleSelect,
          handleUnselect,
          handleSwap,
          handleConfirm,
          requestClose,
          handleRootOpenChange,
        }
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/icons.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/icons.tsx
    lang: tsx
    template: |
      import React from 'react'
      
      export const DragIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg aria-hidden="true" fill="currentColor" viewBox="0 0 12 12" {...props}>
          <circle cx="2" cy="2" r="1" />
          <circle cx="6" cy="2" r="1" />
          <circle cx="10" cy="2" r="1" />
          <circle cx="2" cy="6" r="1" />
          <circle cx="6" cy="6" r="1" />
          <circle cx="10" cy="6" r="1" />
          <circle cx="2" cy="10" r="1" />
          <circle cx="6" cy="10" r="1" />
          <circle cx="10" cy="10" r="1" />
        </svg>
      )
      
      export const AddIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 16 16"
          {...props}
        >
          <path d="M8 3v10M3 8h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
      
      export const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 12 12"
          {...props}
        >
          <path d="M3 3l6 6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 3L3 9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/index.test.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/index.test.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
      import {
        act,
        cleanup,
        render,
        renderHook,
        screen,
        waitFor,
        within,
      } from '@testing-library/react'
      import userEvent from '@testing-library/user-event'
      import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
      import { axe } from 'vitest-axe'
      
      import {
        ProFieldsetDialog,
        useProFieldsetColumns,
        type ProFieldsetDialogProps,
      } from './index'
      import type { FieldColumn } from './types'
      
      vi.mock('@/lib/utils', () => ({
        cn: vi.fn((...args: string[]) => args.filter(Boolean).join(' ')),
      }))
      
      vi.mock('@/registry/default/hooks/use-translation', () => ({
        useTranslation: () => ({
          t: (key: string) => key,
        }),
      }))
      
      vi.mock('@/registry/default/ui/pro-button', () => {
        const React = require('react') as typeof import('react')
        return {
          Button: ({
            children,
            ...rest
          }: React.ComponentPropsWithoutRef<'button'>) => (
            <button type="button" {...rest}>
              {children}
            </button>
          ),
        }
      })
      
      vi.mock('./sortable-list', () => {
        const React = require('react') as typeof import('react')
        return {
          SortableList: ({
            items,
            renderItem,
          }: {
            items: string[]
            renderItem: (args: {
              id: string
              index: number
              disabled: boolean
              attributes: Record<string, unknown>
              listeners: Record<string, (...args: unknown[]) => void> | undefined
              isDragging: boolean
            }) => React.ReactNode
          }) => (
            <div data-testid="sortable-list">
              {items.map((id, index) => (
                <React.Fragment key={id}>
                  {renderItem({
                    id,
                    index,
                    disabled: false,
                    attributes: {},
                    listeners: undefined,
                    isDragging: false,
                  })}
                </React.Fragment>
              ))}
            </div>
          ),
        }
      })
      
      vi.mock('./icons', () => ({
        AddIcon: () => <span data-testid="icon-add" />,
        CloseIcon: () => <span data-testid="icon-close" />,
        DragIcon: () => <span data-testid="icon-drag" />,
      }))
      
      vi.mock('@/registry/default/ui/ui-dialog', () => {
        const React = require('react') as typeof import('react')
      
        const Dialog = ({
          open,
          onOpenChange,
          children,
        }: {
          open?: boolean
          onOpenChange?: (open: boolean) => void
          children: React.ReactNode
        }) => {
          return (
            <div data-testid="dialog-root" data-open={open}>
              {React.Children.map(children, (child) =>
                React.isValidElement(child)
                  ? React.cloneElement(child, { open, onOpenChange })
                  : child
              )}
            </div>
          )
        }
      
        const passthrough =
          (tag: 'div' | 'header' | 'footer', testId?: string) =>
          ({
            children,
            ...rest
          }: { children?: React.ReactNode } & Record<string, unknown>) =>
            React.createElement(
              tag,
              testId ? { 'data-testid': testId, ...rest } : rest,
              children
            )
      
        const DialogContent = passthrough('div', 'dialog-content')
        const DialogBody = passthrough('div', 'dialog-body')
        const DialogHeader = passthrough('header')
        const DialogFooter = passthrough('footer')
        const DialogTitle = ({ children }: { children: React.ReactNode }) => (
          <h2>{children}</h2>
        )
        const DialogDescription = ({ children }: { children: React.ReactNode }) => (
          <p>{children}</p>
        )
        const DialogTrigger = ({ children }: { children: React.ReactElement }) =>
          children
        const DialogCloseButton = ({ onClick }: { onClick?: () => void }) => (
          <button type="button" aria-label="close" onClick={onClick}>
            ×
          </button>
        )
      
        return {
          Dialog,
          DialogContent,
          DialogBody,
          DialogHeader,
          DialogFooter,
          DialogTitle,
          DialogDescription,
          DialogTrigger,
          DialogCloseButton,
        }
      })
      
      type RenderOptions = Partial<ProFieldsetDialogProps>
      
      const baseColumns: FieldColumn[] = [
        { dataIndex: 'alpha', title: 'Alpha', isDisplay: true },
        { dataIndex: 'beta', title: 'Beta', isDisplay: false },
        { dataIndex: 'gamma', title: 'Gamma', isDisplay: true },
      ]
      
      const activeQueryClients: QueryClient[] = []
      
      const renderComponent = (props: RenderOptions = {}) => {
        const queryClient = new QueryClient()
        activeQueryClients.push(queryClient)
      
        return render(
          <QueryClientProvider client={queryClient}>
            <ProFieldsetDialog
              columns={baseColumns}
              defaultOpen
              tableName=""
              {...props}
            />
          </QueryClientProvider>
        )
      }
      
      describe('ProFieldsetDialog', () => {
        let user: ReturnType<typeof userEvent.setup>
      
        beforeEach(() => {
          user = userEvent.setup()
        })
      
        afterEach(() => {
          activeQueryClients.forEach((client) => client.clear())
          activeQueryClients.length = 0
          vi.clearAllMocks()
          cleanup()
        })
      
        describe('given a default ProFieldsetDialog', () => {
          it('should render selected and unselected sections', () => {
            renderComponent()
      
            expect(screen.getByText('SelectedFields')).toBeInTheDocument()
            expect(screen.getByText('UnselectedFields')).toBeInTheDocument()
            expect(screen.getByText('Alpha')).toBeInTheDocument()
          })
      
          it('should have correct display name', () => {
            expect(ProFieldsetDialog.displayName).toBe('ProFieldsetDialog')
          })
        })
      
        describe('when testing accessibility', () => {
          it('should have no accessibility violations', async () => {
            const { container } = renderComponent()
            expect(await axe(container)).toHaveNoViolations()
          })
        })
      
        describe('given prop variations', () => {
          it('should hide close button when showCloseButton is false', () => {
            renderComponent({ showCloseButton: false })
            expect(screen.queryByLabelText('close')).not.toBeInTheDocument()
          })
      
          it('should render with custom className and bodyClassName', () => {
            renderComponent({
              className: 'custom-dialog',
              bodyClassName: 'custom-body',
            })
            expect(screen.getByTestId('dialog-content')).toHaveClass('custom-dialog')
            expect(screen.getByTestId('dialog-body')).toHaveClass('custom-body')
          })
        })
      
        describe('when interacting with ProFieldsetDialog', () => {
          it('should move field from unselected to selected on add', async () => {
            renderComponent()
      
            const unselectedSection = screen
              .getByText('UnselectedFields')
              .closest('section')!
            expect(within(unselectedSection).getByText('Beta')).toBeInTheDocument()
      
            const addButton = screen.getAllByLabelText('FieldSetDialog.Add')[0]
            await user.click(addButton)
      
            const selectedSection = screen
              .getByText('SelectedFields')
              .closest('section')!
            expect(within(selectedSection).getByText('Beta')).toBeInTheDocument()
            expect(
              within(unselectedSection).queryByText('Beta')
            ).not.toBeInTheDocument()
          })
      
          it('should move field from selected to unselected on remove', async () => {
            renderComponent()
      
            const removeButton = screen.getAllByLabelText('FieldSetDialog.Remove')[0]
            await user.click(removeButton)
      
            const unselectedSection = screen
              .getByText('UnselectedFields')
              .closest('section')!
            expect(within(unselectedSection).getByText('Alpha')).toBeInTheDocument()
          })
      
          it('should call onSave and onConfirm when clicking confirm', async () => {
            const handleSave = vi.fn().mockResolvedValue(true)
            const handleConfirm = vi.fn()
      
            renderComponent({
              onSave: handleSave,
              onConfirm: handleConfirm,
            })
      
            await user.click(screen.getByRole('button', { name: 'Confirm' }))
      
            await waitFor(() => {
              expect(handleSave).toHaveBeenCalledTimes(1)
              expect(handleConfirm).toHaveBeenCalledTimes(1)
            })
      
            expect(
              handleConfirm.mock.calls[0][0].map((col: FieldColumn) => col.dataIndex)
            ).toContain('alpha')
          })
        })
      
        describe('when testing keyboard navigation', () => {
          it('should focus add button when tabbing', async () => {
            renderComponent()
            const addButton = screen.getAllByLabelText('FieldSetDialog.Add')[0]
            addButton.focus()
            expect(addButton).toHaveFocus()
          })
        })
      
        describe('when testing edge cases', () => {
          it('should handle empty columns array', () => {
            render(<ProFieldsetDialog columns={[]} defaultOpen tableName="" />)
            expect(screen.getByText('SelectedFields')).toBeInTheDocument()
            expect(screen.getByText('UnselectedFields')).toBeInTheDocument()
          })
      
          it('should support custom renderFieldLabel', () => {
            renderComponent({
              renderFieldLabel: (column) => (
                <span>{`Label:${column.dataIndex}`}</span>
              ),
            })
            expect(screen.getByText('Label:alpha')).toBeInTheDocument()
          })
        })
      
        describe('useProFieldsetColumns', () => {
          const createWrapper = () => {
            const queryClient = new QueryClient()
            activeQueryClients.push(queryClient)
            return ({ children }: { children: React.ReactNode }) => (
              <QueryClientProvider client={queryClient}>
                {children}
              </QueryClientProvider>
            )
          }
      
          it('should merge columns and provide update helper', () => {
            const wrapper = createWrapper()
      
            const { result } = renderHook(
              () => useProFieldsetColumns({ columns: baseColumns }),
              { wrapper }
            )
      
            expect(result.current.columns.map((col) => col.dataIndex)).toEqual([
              'alpha',
              'gamma',
              'beta',
            ])
            expect(result.current.selected.map((col) => col.dataIndex)).toEqual([
              'alpha',
              'gamma',
            ])
            expect(result.current.unselected.map((col) => col.dataIndex)).toEqual([
              'beta',
            ])
      
            act(() => {
              const [alpha, gamma, beta] = result.current.columns
              result.current.updateColumns([
                { ...beta, isDisplay: true },
                { ...alpha, isDisplay: true },
                { ...gamma, isDisplay: false },
              ])
            })
      
            expect(result.current.columns.map((col) => col.dataIndex)).toEqual([
              'beta',
              'alpha',
              'gamma',
            ])
            expect(result.current.selected.map((col) => col.dataIndex)).toEqual([
              'beta',
              'alpha',
            ])
            expect(result.current.unselected.map((col) => col.dataIndex)).toEqual([
              'gamma',
            ])
          })
        })
      })

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/index.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/index.tsx
    lang: tsx
    template: |
      'use client'
      
      import React, { useMemo, type ReactNode } from 'react'
      import type { UniqueIdentifier } from '@dnd-kit/core'
      
      import { cn } from '@/lib/utils'
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { generateUtilityClasses } from '@/registry/default/lib/class-generator'
      import {
        Dialog,
        DialogBody,
        DialogContent,
        DialogTrigger,
        type DialogProps as UiDialogProps,
      } from '@/registry/default/ui/ui-dialog'
      
      import {
        FieldsetFooter,
        FieldsetHeader,
        SelectedFieldsSection,
        UnselectedFieldsSection,
        type FieldsetSlots,
      } from './components'
      import { useFieldsetController } from './hooks'
      import type { CloseReason, FieldColumn, RemoteFieldColumn } from './types'
      import { buildFieldState } from './utils'
      
      const fieldSetDialogClasses = generateUtilityClasses('fieldset-dialog', [
        'content',
        'header',
        'body',
        'section',
        'section-title',
        'section-content',
        'selected-item',
        'selected-item-label',
        'selected-item-handle',
        'selected-item-action',
        'unselected-item',
        'unselected-item-action',
        'footer',
        'trigger',
        'empty',
        'loading',
      ]) as FieldsetSlots
      
      type BaseDialogProps = Omit<
        UiDialogProps,
        'open' | 'defaultOpen' | 'onOpenChange'
      >
      
      interface ProFieldsetDialogProps extends BaseDialogProps {
        columns: FieldColumn[]
        trigger?: ReactNode
        open?: boolean
        defaultOpen?: boolean
        onOpenChange?: (open: boolean) => void
        title?: ReactNode
        description?: ReactNode
        selectedTitle?: ReactNode
        unselectedTitle?: ReactNode
        noDeletedKeys?: string[]
        hiddenKeys?: string[]
        pinnedKeys?: string[]
        className?: string
        bodyClassName?: string
        footer?: ReactNode | null
        confirmText?: ReactNode
        cancelText?: ReactNode
        showCloseButton?: boolean
        renderFieldLabel?: (column: FieldColumn) => ReactNode
        onCancel?: (reason: CloseReason) => void | boolean | Promise<void | boolean>
        onConfirm?: (
          selected: FieldColumn[]
        ) => void | boolean | Promise<void | boolean>
        onSave?: (columns: FieldColumn[]) => void | boolean | Promise<void | boolean>
        loadRemoteColumns?: (
          tableName: string
        ) => Promise<RemoteFieldColumn[] | undefined>
        tableName?: string
      }
      
      const ProFieldsetDialog: React.FC<ProFieldsetDialogProps> = (props) => {
        const {
          columns,
          trigger,
          open: openProp,
          defaultOpen,
          onOpenChange,
          title,
          description,
          selectedTitle,
          unselectedTitle,
          noDeletedKeys,
          hiddenKeys,
          pinnedKeys,
          className,
          bodyClassName,
          footer,
          confirmText,
          cancelText,
          showCloseButton = true,
          renderFieldLabel,
          onCancel,
          onConfirm,
          onSave,
          loadRemoteColumns,
          tableName = '',
          ...dialogProps
        } = props
      
        const { t } = useTranslation('imd')
      
        const dialogTitle = title ?? t('FieldSettings')
        const selectedLabel = selectedTitle ?? t('SelectedFields')
        const unselectedLabel = unselectedTitle ?? t('UnselectedFields')
        const confirmLabel = confirmText ?? t('Confirm')
        const cancelLabel = cancelText ?? t('Cancel')
        const loadingLabel = t('Loading')
        const emptySelectedLabel = t('FieldSetDialog.EmptySelected')
        const emptyUnselectedLabel = t('FieldSetDialog.EmptyUnselected')
        const reorderLabel = t('FieldSetDialog.Reorder')
        const removeLabel = t('FieldSetDialog.Remove')
        const addLabel = t('FieldSetDialog.Add')
      
        const hiddenSet = useMemo(
          () => new Set((hiddenKeys ?? []).filter(Boolean)),
          [hiddenKeys]
        )
        const nonRemovableSet = useMemo(
          () => new Set((noDeletedKeys ?? []).filter(Boolean)),
          [noDeletedKeys]
        )
        const pinnedSet = useMemo(() => {
          const values = [...(pinnedKeys ?? []), ...(noDeletedKeys ?? [])].filter(
            Boolean
          )
          return new Set(values)
        }, [pinnedKeys, noDeletedKeys])
      
        const initialState = useMemo(() => buildFieldState({ columns }), [columns])
      
        const {
          open,
          handleRootOpenChange,
          requestClose,
          selected,
          unselected,
          loading,
          saving,
          handleSelect,
          handleUnselect,
          handleSwap,
          handleConfirm,
        } = useFieldsetController({
          columns,
          initialState,
          openProp,
          defaultOpen,
          onOpenChange,
          tableName,
          loadRemoteColumns,
          onCancel,
          onSave,
          onConfirm,
          nonRemovableSet,
          pinnedSet,
        })
      
        const isReadOnly = saving || loading
      
        const visibleSelected = useMemo(
          () => selected.filter((column) => !hiddenSet.has(column.dataIndex)),
          [selected, hiddenSet]
        )
      
        const visibleSelectedIds = useMemo(
          () => visibleSelected.map((column) => column.dataIndex),
          [visibleSelected]
        )
      
        const disabledDragIds = useMemo(
          () =>
            new Set<UniqueIdentifier>(
              visibleSelected
                .filter((column) => pinnedSet.has(column.dataIndex))
                .map((column) => column.dataIndex)
            ),
          [visibleSelected, pinnedSet]
        )
      
        const visibleUnselected = useMemo(
          () => unselected.filter((column) => !hiddenSet.has(column.dataIndex)),
          [unselected, hiddenSet]
        )
      
        return (
          <Dialog open={open} onOpenChange={handleRootOpenChange} {...dialogProps}>
            {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      
            <DialogContent
              className={cn('max-w-[900px]', className)}
              data-ui-slot={fieldSetDialogClasses.content}
              size="large"
            >
              <FieldsetHeader
                description={description}
                showCloseButton={showCloseButton}
                slots={fieldSetDialogClasses}
                title={dialogTitle}
                onClose={() => void requestClose('close-button')}
              />
      
              <DialogBody
                className={cn('px-6', bodyClassName)}
                data-ui-slot={fieldSetDialogClasses.body}
              >
                <div className="flex flex-col gap-4 py-2">
                  <SelectedFieldsSection
                    disabledDragIds={disabledDragIds}
                    emptyLabel={emptySelectedLabel}
                    isLoading={loading}
                    isReadOnly={isReadOnly}
                    itemIds={visibleSelectedIds}
                    items={visibleSelected}
                    label={selectedLabel}
                    loadingLabel={loadingLabel}
                    removeLabel={removeLabel}
                    renderFieldLabel={renderFieldLabel}
                    reorderLabel={reorderLabel}
                    slots={fieldSetDialogClasses}
                    onRemove={handleUnselect}
                    onSwap={handleSwap}
                  />
      
                  <UnselectedFieldsSection
                    addLabel={addLabel}
                    emptyLabel={emptyUnselectedLabel}
                    isLoading={loading}
                    isReadOnly={isReadOnly}
                    items={visibleUnselected}
                    label={unselectedLabel}
                    loadingLabel={loadingLabel}
                    renderFieldLabel={renderFieldLabel}
                    slots={fieldSetDialogClasses}
                    onAdd={handleSelect}
                  />
                </div>
              </DialogBody>
      
              <FieldsetFooter
                cancelLabel={cancelLabel}
                confirmLabel={confirmLabel}
                confirmLoading={saving}
                disableConfirm={saving || loading}
                footer={footer}
                isReadOnly={isReadOnly}
                slots={fieldSetDialogClasses}
                onCancel={() => void requestClose('cancel-button')}
                onConfirm={() => void handleConfirm()}
              />
            </DialogContent>
          </Dialog>
        )
      }
      
      ProFieldsetDialog.displayName = 'ProFieldsetDialog'
      
      export { ProFieldsetDialog, type ProFieldsetDialogProps }
      export type {
        FieldColumn,
        RemoteFieldColumn,
        CloseReason,
        FieldColumn as ProFieldsetDialogColumn,
        RemoteFieldColumn as ProFieldsetDialogRemoteColumn,
      }
      export { useProFieldsetColumns } from './hooks'

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/meta.json
    out: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/meta.json
    lang: json
    template: |
      {
        "dependencies": [
          "@dnd-kit/core",
          "@dnd-kit/sortable",
          "@dnd-kit/utilities",
          "@radix-ui/react-use-controllable-state"
        ],
        "registryDependencies": [
          "i18n",
          "pro-button",
          "ui-dialog",
          "class-generator"
        ],
        "tags": ["dialog", "fields", "column", "字段", "弹窗", "拖拽", "排序"]
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/sortable-list.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/sortable-list.tsx
    lang: tsx
    template: |
      import React, { useCallback } from 'react'
      import {
        DndContext,
        type DragEndEvent,
        type DraggableAttributes,
        type UniqueIdentifier,
      } from '@dnd-kit/core'
      import { SortableContext, useSortable } from '@dnd-kit/sortable'
      import { CSS } from '@dnd-kit/utilities'
      
      import { cn } from '@/lib/utils'
      
      export type SortableListeners = Record<string, (...args: any[]) => void>
      
      export type SortableRenderItemProps = {
        id: UniqueIdentifier
        index: number
        disabled: boolean
        attributes: DraggableAttributes
        listeners: SortableListeners | undefined
        isDragging: boolean
      }
      
      interface SortableItemProps {
        id: UniqueIdentifier
        index: number
        disabled: boolean
        render: (props: SortableRenderItemProps) => React.ReactNode
      }
      
      const SortableItem: React.FC<SortableItemProps> = ({
        id,
        index,
        disabled,
        render,
      }) => {
        const {
          setNodeRef,
          listeners: sortableListeners,
          attributes,
          transform,
          transition,
          isDragging,
        } = useSortable({ id, disabled })
      
        const listeners = sortableListeners as SortableListeners | undefined
      
        const style: React.CSSProperties = {
          transform: CSS.Transform.toString(transform),
          transition,
        }
      
        return (
          <div
            ref={setNodeRef}
            className={cn('touch-none', isDragging ? 'z-10' : undefined)}
            style={style}
          >
            {render({ id, index, disabled, attributes, listeners, isDragging })}
          </div>
        )
      }
      
      interface SortableListProps {
        items: UniqueIdentifier[]
        disabledIds?: Set<UniqueIdentifier>
        onDragEnd?: (activeId: UniqueIdentifier, overId: UniqueIdentifier) => void
        renderItem: (props: SortableRenderItemProps) => React.ReactNode
      }
      
      export const SortableList: React.FC<SortableListProps> = ({
        items,
        disabledIds,
        onDragEnd,
        renderItem,
      }) => {
        const handleDragEnd = useCallback(
          (event: DragEndEvent) => {
            const { active, over } = event
            if (!over) return
      
            const activeId = active.id
            const overId = over.id
      
            if (activeId === overId) return
            if (disabledIds?.has(overId)) return
      
            onDragEnd?.(activeId, overId)
          },
          [disabledIds, onDragEnd]
        )
      
        return (
          <DndContext onDragEnd={handleDragEnd}>
            <SortableContext items={items}>
              <div className="flex flex-wrap gap-2">
                {items.map((itemId, index) => (
                  <SortableItem
                    key={String(itemId)}
                    disabled={disabledIds?.has(itemId) ?? false}
                    id={itemId}
                    index={index}
                    render={renderItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/types.ts
    out: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/types.ts
    lang: ts
    template: |
      import type { ReactNode } from 'react'
      import type { UniqueIdentifier } from '@dnd-kit/core'
      
      export interface FieldColumn {
        dataIndex: string
        title: ReactNode
        id?: UniqueIdentifier
        isDisplay?: boolean
        hidden?: boolean
        fixed?: 'left' | 'right'
        [key: string]: unknown
      }
      
      export type RemoteFieldColumn = Partial<FieldColumn> &
        Pick<FieldColumn, 'dataIndex'>
      
      export type CloseReason = 'cancel-button' | 'close-button' | 'dismiss'
      
      export interface FieldState {
        selected: FieldColumn[]
        unselected: FieldColumn[]
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/utils.ts
    out: apps/www2/registry/default/templates/workbench/blocks/ui/fieldset-dialog/utils.ts
    lang: ts
    template: |
      import { request } from '@/registry/default/lib/request'
      
      import type { FieldColumn, FieldState, RemoteFieldColumn } from './types'
      
      export const ensureColumn = (column: FieldColumn): FieldColumn => ({
        ...column,
        id: column.id ?? column.dataIndex,
      })
      
      export const cloneColumns = (columns: FieldColumn[]) =>
        columns.map((column) => ({ ...column }))
      
      interface BuildFieldStateArgs {
        columns: FieldColumn[]
        remoteColumns?: RemoteFieldColumn[]
      }
      
      export const buildFieldState = ({
        columns,
        remoteColumns,
      }: BuildFieldStateArgs): FieldState => {
        const selected: FieldColumn[] = []
        const unselected: FieldColumn[] = []
        const normalized = columns.map(ensureColumn)
        const columnMap = new Map(normalized.map((col) => [col.dataIndex, col]))
      
        if (remoteColumns?.length) {
          const seen = new Set<string>()
      
          remoteColumns.forEach((remote) => {
            const base = columnMap.get(remote.dataIndex)
            if (!base) return
      
            const merged = { ...base, ...remote }
            if (merged.hidden) return
      
            seen.add(merged.dataIndex)
      
            const isDisplay = remote.isDisplay ?? merged.isDisplay ?? true
            const next = { ...merged, isDisplay }
      
            if (isDisplay) {
              selected.push(next)
            } else {
              unselected.push({ ...next, isDisplay: false })
            }
          })
      
          normalized.forEach((column) => {
            if (column.hidden || seen.has(column.dataIndex)) return
      
            const isDisplay = column.isDisplay ?? true
            const next = { ...column, isDisplay }
      
            if (isDisplay) {
              selected.push(next)
            } else {
              unselected.push({ ...next, isDisplay: false })
            }
          })
        } else {
          normalized.forEach((column) => {
            if (column.hidden) return
      
            const isDisplay = column.isDisplay ?? true
            const next = { ...column, isDisplay }
      
            if (isDisplay) {
              selected.push(next)
            } else {
              unselected.push({ ...next, isDisplay: false })
            }
          })
        }
      
        return { selected, unselected }
      }
      
      export const composeFinalFieldList = (
        selected: FieldColumn[],
        unselected: FieldColumn[]
      ) => {
        const selectedWithFlag = selected.map((column) => ({
          ...column,
          isDisplay: true,
        }))
        const unselectedWithFlag = unselected.map((column) => ({
          ...column,
          isDisplay: false,
        }))
      
        const all = [...selectedWithFlag, ...unselectedWithFlag]
        const left = all.filter((column) => column.fixed === 'left')
        const right = all.filter((column) => column.fixed === 'right')
        const center = all.filter(
          (column) => column.fixed !== 'left' && column.fixed !== 'right'
        )
      
        return [...left, ...center, ...right]
      }
      
      const REMOTE_TABLE_VERSION_SUFFIX = '_v2'
      
      const getRemoteTableName = (tableName: string) => {
        if (!tableName) return ''
        return `${tableName}${REMOTE_TABLE_VERSION_SUFFIX}`
      }
      
      interface FetchRemoteFieldsResponse {
        fieldList?: string | null
      }
      
      const isRemoteFieldColumn = (value: unknown): value is RemoteFieldColumn => {
        if (!value || typeof value !== 'object') return false
        const record = value as Record<string, unknown>
        return typeof record.dataIndex === 'string'
      }
      
      const parseRemoteFieldList = (
        fieldList?: string | null
      ): RemoteFieldColumn[] => {
        if (!fieldList) return []
      
        try {
          const parsed = JSON.parse(fieldList)
          if (!Array.isArray(parsed)) return []
          return parsed.filter(isRemoteFieldColumn).map((item) => ({ ...item }))
        } catch {
          return []
        }
      }
      
      export const defaultLoadRemoteColumns = async (
        tableName: string
      ): Promise<RemoteFieldColumn[]> => {
        const remoteTableName = getRemoteTableName(tableName)
        if (!remoteTableName) return []
      
        try {
          const response = await request<FetchRemoteFieldsResponse>(
            '/saastms/base/customize/getFields',
            {
              method: 'POST',
              data: { tableName: remoteTableName },
            }
          )
      
          return parseRemoteFieldList(response?.fieldList)
        } catch (error) {
          console.error('[ProFieldsetDialog] defaultLoadRemoteColumns failed', error)
          return []
        }
      }
      
      export const defaultSaveRemoteColumns = async (
        tableName: string,
        columns: FieldColumn[]
      ): Promise<boolean> => {
        const remoteTableName = getRemoteTableName(tableName)
        if (!remoteTableName) return true
      
        const payload = columns
          .filter((column) => column?.dataIndex)
          .map((column) => ({
            dataIndex: column.dataIndex,
            isDisplay: column.isDisplay ?? true,
          }))
      
        try {
          const response = await request<boolean>(
            '/saastms/base/customize/saveFields',
            {
              method: 'POST',
              data: {
                fieldList: JSON.stringify(payload),
                tableName: remoteTableName,
              },
            }
          )
      
          if (response === false) return false
          return true
        } catch (error) {
          console.error('[ProFieldsetDialog] defaultSaveRemoteColumns failed', error)
          return false
        }
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-indicator/__tests__/index.test.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-indicator/__tests__/index.test.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      import { cleanup, render, screen } from '@testing-library/react'
      import userEvent from '@testing-library/user-event'
      import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
      import { axe } from 'vitest-axe'
      
      import { WorkbenchIndicator, type WorkbenchIndicatorProps } from '../index'
      
      vi.mock('@/lib/utils', () => ({
        cn: vi.fn((...args: unknown[]) =>
          args
            .flatMap((arg) => {
              if (!arg) return []
              if (typeof arg === 'string') return [arg]
              if (typeof arg === 'object') {
                return Object.entries(arg)
                  .filter(([, value]) => Boolean(value))
                  .map(([key]) => key)
              }
              return [String(arg)]
            })
            .join(' ')
        ),
      }))
      
      vi.mock('@/registry/default/lib/class-generator', () => ({
        generateUtilityClasses: vi.fn((name: string, slots: string[]) =>
          slots.reduce<Record<string, string>>((acc, slot) => {
            acc[slot] = `${name}-${slot}`
            return acc
          }, {})
        ),
      }))
      
      vi.mock('@/registry/default/ui/pro-tooltip', () => ({
        Tooltip: ({
          title,
          children,
        }: {
          title?: React.ReactNode
          children: React.ReactNode
        }) => (
          <div data-testid="mock-tooltip" data-title={title}>
            {children}
          </div>
        ),
      }))
      
      describe('WorkbenchIndicator', () => {
        let user: ReturnType<typeof userEvent.setup>
      
        beforeEach(() => {
          user = userEvent.setup()
        })
      
        afterEach(() => {
          cleanup()
          vi.clearAllMocks()
        })
      
        const setup = (props?: Partial<WorkbenchIndicatorProps>) => {
          const defaultProps: WorkbenchIndicatorProps = {
            count: 128,
            children: '今日揽收',
          }
          return render(<WorkbenchIndicator {...defaultProps} {...props} />)
        }
      
        describe('given a default WorkbenchIndicator', () => {
          it('should render title and formatted count', () => {
            setup()
            expect(screen.getByText('今日揽收')).toBeInTheDocument()
            expect(screen.getByText('128')).toBeInTheDocument()
            expect(
              screen.getByRole('button', { name: /今日揽收/ })
            ).toBeInTheDocument()
          })
      
          it('should have no accessibility violations', async () => {
            const { container } = setup()
            const results = await axe(container)
            expect(results).toHaveNoViolations()
          })
        })
      
        describe('when count is zero', () => {
          it('should hide count when hiddenCountWhenZero is true', () => {
            setup({ count: 0, hiddenCountWhenZero: true })
            expect(
              screen
                .getByRole('button', { name: /今日揽收/ })
                .querySelector('[data-ui-slot="workbench-indicator-count"]')
            ).not.toBeInTheDocument()
          })
      
          it('should show indicator icon when zero is visible', () => {
            setup({ count: 0 })
            const icon = screen
              .getByRole('button')
              .querySelector('[data-ui-slot="workbench-indicator-count-icon"]')
            expect(icon).toBeInTheDocument()
          })
        })
      
        describe('when passing custom props', () => {
          it('should use countFormatter for numeric values', () => {
            setup({
              count: 12800,
              countFormatter: (value) => `${(value / 1000).toFixed(1)}k`,
            })
            expect(screen.getByText('12.8k')).toBeInTheDocument()
          })
      
          it('should render string count directly', () => {
            setup({ count: 'N/A' })
            expect(screen.getByText('N/A')).toBeInTheDocument()
          })
      
          it('should render custom zero icon', () => {
            setup({
              count: 0,
              indicatorIcon: <span data-testid="custom-icon">Zero</span>,
            })
            expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
          })
      
          it('should pass tooltip title to tooltip component', () => {
            setup({ tooltip: '仓库说明' })
            expect(screen.getByTestId('mock-tooltip')).toHaveAttribute(
              'data-title',
              '仓库说明'
            )
          })
        })
      
        describe('when interacting with the component', () => {
          it('should call onClick and toggle selected state', async () => {
            const handleClick = vi.fn()
            setup({
              onClick: handleClick,
              isSelected: true,
            })
      
            const button = screen.getByRole('button')
            await user.click(button)
      
            expect(handleClick).toHaveBeenCalledTimes(1)
            expect(button).toHaveAttribute('data-selected', '')
          })
      
          it('should render as anchor when asChild is enabled', () => {
            render(
              <WorkbenchIndicator asChild count={42}>
                <a href="#detail">转到详情</a>
              </WorkbenchIndicator>
            )
      
            const anchor = screen.getByRole('link', { name: '转到详情' })
            expect(anchor.tagName.toLowerCase()).toBe('a')
            expect(anchor).not.toHaveAttribute('type')
          })
        })
      })

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-indicator/index.PROMPT.md
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-indicator/index.PROMPT.md
    lang: md
    template: |
      说明
      
      - 工作台场景下的指标入口，整合左侧色条、标题提示、指标数值与跳转箭头，支持零值徽章与隐藏逻辑
      
      变体
      
      ```tsx
      import { WorkbenchIndicator } from '@/components/ui/workbench-indicator'
      
      ;<div className="w-[320px] space-y-2">
        <WorkbenchIndicator count={268} tooltip="今日揽收总量">
          今日揽收
        </WorkbenchIndicator>
        <WorkbenchIndicator
          count={0}
          extra={
            <span className="text-xs text-[color:var(--color-gray-7)]">待处理</span>
          }
          isSelected
        >
          异常订单
        </WorkbenchIndicator>
      </div>
      ```
      
      注意
      
      - `hiddenCountWhenZero` 可直接隐藏数值区块；若希望展示零态提示则传入自定义 `indicatorIcon`
      - `countFormatter` 接收数值后返回渲染节点，适合处理千分位或单位缩写
      - 带交互点击时默认渲染 `<button>`，需要合并到外层路由时可使用 `asChild` 包裹 Link

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-indicator/index.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-indicator/index.tsx
    lang: tsx
    template: |
      'use client'
      
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      import { generateUtilityClasses } from '@/registry/default/lib/class-generator'
      import { Tooltip } from '@/registry/default/ui/pro-tooltip'
      
      const indicatorClasses = generateUtilityClasses('workbench-indicator', [
        'root',
        'bar',
        'content',
        'title',
        'tooltip-trigger',
        'count',
        'count-icon',
        'extra',
        'arrow',
      ])
      
      const ZeroIndicatorIcon = () => (
        <svg
          fill="none"
          height="13"
          viewBox="0 0 17 13"
          width="17"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6.36396 9.19238L15.5564 0L16.9706 1.41421L6.36396 12.0208L0 5.65688L1.41422 4.24268L6.36396 9.19238Z"
            fill="var(--workbench-indicator-zero-icon,var(--color-green-primary))"
          />
        </svg>
      )
      
      const MoreArrowIcon = () => (
        <svg
          aria-hidden="true"
          fill="none"
          height="14"
          viewBox="0 0 14 14"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            fill="var(--workbench-indicator-arrow,var(--color-gray-6))"
            fillRule="nonzero"
          >
            <path d="M4.26 11.03l5.26-5.26L10.76 7 5.5 12.26z"></path>
            <path d="M5.5 1.75L10.75 7 9.52 8.24 4.26 2.98z"></path>
          </g>
        </svg>
      )
      
      const WenhaoIcon = () => (
        <svg
          aria-hidden="true"
          fill="none"
          height="14"
          viewBox="0 0 1024 1024"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M512 0a512 512 0 100 1024A512 512 0 00512 0zm0 809.13a45.74 45.74 0 110-91.4 45.74 45.74 0 010 91.4zm71.85-250.88a55.21 55.21 0 00-35.24 51.2v25.94a9.13 9.13 0 01-9.22 9.22h-54.7a9.13 9.13 0 01-9.21-9.22v-24.57a127.74 127.74 0 0182.26-120.92c38.91-14.93 64-47.53 64-83.03 0-50.35-49.24-91.48-109.65-91.48s-109.74 41.05-109.74 91.48v8.7a9.13 9.13 0 01-9.13 9.13h-54.87a9.13 9.13 0 01-9.13-9.13v-8.7c0-44.89 19.62-86.87 55.3-118.1A192.68 192.68 0 01512 242.35c48.04 0 93.27 16.55 127.57 46.5 35.59 31.24 55.3 73.22 55.3 118.1 0 66.05-43.52 125.44-110.93 151.39z"
            fill="currentColor"
          />
        </svg>
      )
      
      const COUNT_FONT_FAMILY = 'TCloudNumber, var(--font-sans)'
      
      type CountValue = number | string | React.ReactNode
      
      interface WorkbenchIndicatorProps
        extends React.ButtonHTMLAttributes<HTMLButtonElement> {
        /** 右侧计数展示的值，支持数字、字符串或自定义节点 */
        count?: CountValue
        /** 当数值为 0 时是否完全隐藏计数 */
        hiddenCountWhenZero?: boolean
        /** 是否处于选中态 */
        isSelected?: boolean
        /** 标题右侧的提示内容 */
        tooltip?: React.ReactNode
        /** 计数与箭头之间的补充内容 */
        extra?: React.ReactNode
        /** 左侧指示条的 className */
        barClassName?: string
        /** 左侧指示条的内联样式 */
        barStyle?: React.CSSProperties
        /** 计数文本的 className */
        countClassName?: string
        /** 计数文本的内联样式 */
        countStyle?: React.CSSProperties
        /** 自定义零值图标，默认展示内置的勾选徽章 */
        indicatorIcon?: React.ReactNode
        /** 自定义数字格式化函数 */
        countFormatter?: (value: number) => React.ReactNode
        /** 允许传入自定义触发节点 */
        asChild?: boolean
      }
      
      const resolveNumber = (count: CountValue) => {
        if (typeof count === 'number') return Number.isFinite(count) ? count : null
        if (typeof count === 'string') {
          const trimmed = count.trim()
          if (trimmed.length === 0) return null
          const numeric = Number(trimmed)
          return Number.isFinite(numeric) ? numeric : null
        }
        return null
      }
      
      const formatNumber = (
        value: number,
        formatter?: (value: number) => React.ReactNode
      ) => {
        if (formatter) return formatter(value)
        return value.toLocaleString('zh-CN')
      }
      
      const WorkbenchIndicator = React.forwardRef<
        HTMLButtonElement,
        WorkbenchIndicatorProps
      >((props, ref) => {
        const {
          count,
          hiddenCountWhenZero = false,
          isSelected = false,
          tooltip,
          extra,
          className,
          style,
          barClassName,
          barStyle,
          countClassName,
          countStyle,
          indicatorIcon,
          countFormatter,
          asChild = false,
          children,
          disabled,
          onClick,
          ...rest
        } = props
      
        const childElement =
          asChild && React.isValidElement(children)
            ? (children as React.ReactElement)
            : null
      
        const labelContent = childElement ? childElement.props.children : children
      
        const numericValue = React.useMemo(() => resolveNumber(count), [count])
        const isNumeric = numericValue !== null
        const isZero = isNumeric && numericValue === 0
        const shouldHideCount = hiddenCountWhenZero && isZero
        const hasPositiveValue = isNumeric && numericValue > 0
      
        const baseStyle = React.useMemo<React.CSSProperties>(
          () => ({
            border: '0.5px solid var(--workbench-indicator-border,var(--color-card))',
            ...style,
          }),
          [style]
        )
      
        const barStyles = React.useMemo<React.CSSProperties>(
          () => ({
            ...barStyle,
          }),
          [barStyle]
        )
      
        const countStyles = React.useMemo<React.CSSProperties>(
          () => ({
            fontFamily: COUNT_FONT_FAMILY,
            ...countStyle,
          }),
          [countStyle]
        )
      
        const resolvedIndicatorIcon = React.useMemo(
          () => indicatorIcon ?? <ZeroIndicatorIcon />,
          [indicatorIcon]
        )
      
        const countNode = React.useMemo(() => {
          if (shouldHideCount) return null
          if (isZero) {
            return (
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center',
                  indicatorClasses['count-icon'],
                  countClassName
                )}
                data-ui-slot={indicatorClasses['count-icon']}
              >
                {resolvedIndicatorIcon}
              </span>
            )
          }
      
          if (isNumeric && numericValue !== null) {
            return (
              <span
                className={cn(
                  'text-red-6 min-w-[24px] text-right text-base font-bold leading-none',
                  indicatorClasses.count,
                  countClassName
                )}
                data-ui-slot={indicatorClasses.count}
                style={countStyles}
              >
                {formatNumber(numericValue, countFormatter)}
              </span>
            )
          }
      
          if (count === undefined || count === null || count === '') {
            return null
          }
      
          return (
            <span
              className={cn(
                'text-red-6 min-w-[24px] text-right text-base font-bold leading-none',
                indicatorClasses.count,
                countClassName
              )}
              data-ui-slot={indicatorClasses.count}
              style={countStyles}
            >
              {count}
            </span>
          )
        }, [
          count,
          countClassName,
          countFormatter,
          countStyles,
          isNumeric,
          isZero,
          numericValue,
          resolvedIndicatorIcon,
          shouldHideCount,
        ])
      
        const content = (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'my-[2px] mr-2 flex w-[2px] shrink-0 self-stretch rounded-full',
                hasPositiveValue ? 'bg-red-6' : 'bg-gray-5',
                indicatorClasses.bar,
                barClassName
              )}
              data-ui-slot={indicatorClasses.bar}
              style={barStyles}
            />
            <span
              className={cn(
                'flex flex-1 items-center gap-1 text-[14px]',
                indicatorClasses.title
              )}
              data-ui-slot={indicatorClasses.title}
            >
              <span
                className={cn('truncate', indicatorClasses.content)}
                data-ui-slot={indicatorClasses.content}
              >
                {labelContent}
              </span>
              {tooltip ? (
                <Tooltip title={tooltip}>
                  <span
                    aria-label={typeof tooltip === 'string' ? tooltip : undefined}
                    className={cn(
                      'text-gray-5 ml-1 flex h-4 w-4 shrink-0 items-center justify-center text-[12px]',
                      indicatorClasses['tooltip-trigger']
                    )}
                    data-ui-slot={indicatorClasses['tooltip-trigger']}
                    role={typeof tooltip === 'string' ? 'img' : undefined}
                  >
                    <WenhaoIcon />
                  </span>
                </Tooltip>
              ) : null}
            </span>
            {countNode}
            {extra ? (
              <span
                className={cn(
                  'ml-2 flex items-center text-xs text-[color:var(--indicator-extra-color,var(--color-gray-7))]',
                  indicatorClasses.extra
                )}
                data-ui-slot={indicatorClasses.extra}
              >
                {extra}
              </span>
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                'flex h-6 w-6 items-center justify-center',
                indicatorClasses.arrow
              )}
              data-ui-slot={indicatorClasses.arrow}
            >
              <MoreArrowIcon />
            </span>
          </>
        )
      
        const rootClassName = cn(
          'group inline-flex w-full items-center justify-start rounded-lg bg-white px-4 py-[6px] text-left text-sm transition-colors  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--workbench-indicator-outline,var(--color-primary-3))]',
          disabled
            ? 'pointer-events-none cursor-not-allowed opacity-60'
            : 'cursor-pointer',
          isSelected ? null : 'hover:bg-gray-1',
          isSelected && 'bg-imileBlue-1',
          indicatorClasses.root,
          className
        )
      
        if (childElement) {
          const mergedOnClick = (
            event: React.MouseEvent<HTMLElement, MouseEvent>
          ) => {
            childElement.props.onClick?.(event)
            if (event.defaultPrevented) return
            onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>)
          }
      
          const mergedStyle = {
            ...childElement.props.style,
            ...baseStyle,
          }
      
          return React.cloneElement(childElement, {
            ...rest,
            ref: ref as React.Ref<any>,
            className: cn(rootClassName, childElement.props.className),
            style: mergedStyle,
            'data-selected': isSelected ? '' : undefined,
            'data-ui-slot': indicatorClasses.root,
            'aria-disabled': disabled ? true : undefined,
            onClick: mergedOnClick,
            children: content,
          })
        }
      
        return (
          <button
            ref={ref}
            className={rootClassName}
            data-selected={isSelected ? '' : undefined}
            data-ui-slot={indicatorClasses.root}
            disabled={disabled}
            style={baseStyle}
            type="button"
            onClick={onClick}
            {...rest}
          >
            {content}
          </button>
        )
      })
      
      WorkbenchIndicator.displayName = 'WorkbenchIndicator'
      
      export { WorkbenchIndicator }
      export type { WorkbenchIndicatorProps }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-indicator/meta.json
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-indicator/meta.json
    lang: json
    template: |
      {
        "registryDependencies": ["class-generator", "pro-tooltip"],
        "tags": [
          "indicator",
          "workbench",
          "summary-card",
          "kpi",
          "指标组件",
          "工作台",
          "关键指标"
        ]
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-layout/index.PROMPT.md
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-layout/index.PROMPT.md
    lang: md
    template: |
      说明
      
      - 用 WorkbenchLayout 把主要工作区与可折叠侧边区拼在一起，适合桌面+窄屏双场景
      
      变体
      
      ```tsx
      import { WorkbenchLayout } from '@/components/ui/workbench-layout'
      
      ;<WorkbenchLayout
        sidebarWidth={360}
        toggleLabels={{ expand: '展开侧栏', collapse: '收起侧栏' }}
      >
        {/* 左列 */}
        <div className="space-y-2 p-6">主要信息</div>
      
        {/* 右列 */}
        <WorkbenchRight>
          <div className="space-y-1">
            <WorkbenchRight.Title>班次面板</WorkbenchRight.Title>
            <WorkbenchRight.SubTitle>06:00-15:00 进行中</WorkbenchRight.SubTitle>
          </div>
          <div className="space-y-2 p-4">
            <div className="rounded-md border border-border/60 p-4">
              <div className="font-medium">侧边表单</div>
              <p className="text-sm text-muted-foreground">在窄屏下可折叠</p>
            </div>
          </div>
        </WorkbenchRight>
      </WorkbenchLayout>
      ```
      
      注意
      
      - 右侧内容为空时自动隐藏切换按钮，避免渲染空容器
      - 窄屏（<=1366px）默认折叠，可用 `defaultCollapsedOnNarrow` 或 `collapsed/onCollapsedChange` 做受控
      - `toggleLabels` 用于屏幕阅读，需提供与你产品文案一致的 `expand/collapse`
      - `sidebarWidth` 同时影响宽度与 `flex-basis`，保持左右区域布局稳定
      - children 默认按照 [左列, 右列] 顺序传入，建议在 JSX 中添加注释标记语义
      - 与 `WorkbenchRight` 搭配时，按照 children 顺序（顶部 → 主体）组织结构，旧版 `top` / `content` props 仍可兜底兼容

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-layout/index.test.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-layout/index.test.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      import { cleanup, render, screen, waitFor } from '@testing-library/react'
      import userEvent from '@testing-library/user-event'
      import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
      
      import { WorkbenchLayout, type WorkbenchLayoutProps } from './index'
      
      const getRightPane = () =>
        document.querySelector(
          '[data-ui-slot="workbench-layout-right"]'
        ) as HTMLElement | null
      
      const getToggleContainer = () =>
        document.querySelector(
          '[data-ui-slot="workbench-layout-toggle"]'
        ) as HTMLElement | null
      
      describe('WorkbenchLayout', () => {
        const originalInnerWidth = window.innerWidth
        const user = userEvent.setup()
      
        const renderLayout = (
          props?: Partial<WorkbenchLayoutProps> & {
            childrenOverride?: React.ReactNode
          }
        ) => {
          const { childrenOverride, ...rest } = props ?? {}
      
          return render(
            <WorkbenchLayout {...rest}>
              {childrenOverride ?? (
                <>
                  <div>Left Content</div>
                  <div>Right Content</div>
                </>
              )}
            </WorkbenchLayout>
          )
        }
      
        beforeEach(() => {
          vi.clearAllMocks()
        })
      
        afterEach(() => {
          cleanup()
          window.innerWidth = originalInnerWidth
        })
      
        it('should have a display name', () => {
          expect(WorkbenchLayout.displayName).toBe('WorkbenchLayout')
        })
      
        it('should render two columns when viewport is wider than breakpoint', async () => {
          window.innerWidth = 1600
          renderLayout()
      
          await waitFor(() => {
            const rightPane = getRightPane()
            expect(rightPane).not.toBeNull()
            expect(rightPane?.style.width).toBe('320px')
            expect(rightPane?.style.flexBasis).toBe('320px')
          })
      
          const toggle = getToggleContainer()
          expect(toggle).toHaveAttribute('aria-hidden', 'true')
        })
      
        it('should collapse right pane and show toggle when viewport is narrow', async () => {
          window.innerWidth = 1200
          renderLayout()
      
          await waitFor(() => {
            const rightPane = getRightPane()
            expect(rightPane).not.toBeNull()
            expect(rightPane?.style.width).toBe('0px')
            expect(rightPane?.style.flexBasis).toBe('0px')
          })
      
          const toggleButton = screen.getByRole('button', { name: '展开右侧容器' })
          expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
        })
      
        it('should expand right pane when toggle is clicked', async () => {
          window.innerWidth = 1280
          const handleCollapsedChange = vi.fn()
          renderLayout({ onCollapsedChange: handleCollapsedChange })
      
          const toggleButton = await screen.findByRole('button', {
            name: '展开右侧容器',
          })
      
          await user.click(toggleButton)
      
          await waitFor(() => {
            const rightPane = getRightPane()
            expect(rightPane).not.toBeNull()
            expect(rightPane?.style.width).toBe('320px')
            expect(rightPane?.style.flexBasis).toBe('320px')
            expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
          })
      
          expect(handleCollapsedChange).toHaveBeenCalledWith(false)
        })
      
        it('should notify initial collapsed state when uncontrolled', async () => {
          window.innerWidth = 1000
          const handleCollapsedChange = vi.fn()
          renderLayout({ onCollapsedChange: handleCollapsedChange })
      
          await waitFor(() => {
            expect(handleCollapsedChange).toHaveBeenCalledWith(true)
          })
        })
      
        it('should respect controlled collapsed prop', async () => {
          window.innerWidth = 1100
          const handleCollapsedChange = vi.fn()
      
          const { rerender } = renderLayout({
            collapsed: true,
            onCollapsedChange: handleCollapsedChange,
          })
      
          const toggleButton = await screen.findByRole('button', {
            name: '展开右侧容器',
          })
      
          await user.click(toggleButton)
          expect(handleCollapsedChange).toHaveBeenCalledWith(false)
      
          rerender(
            <WorkbenchLayout
              collapsed={false}
              onCollapsedChange={handleCollapsedChange}
            >
              <div>Left</div>
              <div>Right</div>
            </WorkbenchLayout>
          )
      
          await waitFor(() => {
            const rightPane = getRightPane()
            expect(rightPane).not.toBeNull()
            expect(rightPane?.style.width).toBe('320px')
            expect(rightPane?.style.flexBasis).toBe('320px')
          })
        })
      
        it('should allow disabling default collapsed state on narrow screens', async () => {
          window.innerWidth = 1000
          renderLayout({ defaultCollapsedOnNarrow: false })
      
          await waitFor(() => {
            const rightPane = getRightPane()
            expect(rightPane).not.toBeNull()
            expect(rightPane?.style.width).toBe('320px')
            expect(rightPane?.style.flexBasis).toBe('320px')
          })
      
          const toggleButton = screen.getByRole('button', { name: '收起右侧容器' })
          expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
        })
      
        it('should hide toggle when right content is missing', () => {
          renderLayout({ childrenOverride: <div>Only Left</div> })
          const toggle = getToggleContainer()
          expect(toggle).toBeInTheDocument()
          expect(toggle).toHaveAttribute('aria-hidden', 'true')
          expect(toggle?.querySelector('button')).toBeNull()
        })
      
        it('should still support left/right props for compatibility', async () => {
          window.innerWidth = 1500
          render(
            <WorkbenchLayout
              left={<div data-testid="legacy-left">Legacy Left</div>}
              right={<div data-testid="legacy-right">Legacy Right</div>}
            />
          )
      
          expect(screen.getByTestId('legacy-left')).toBeInTheDocument()
          expect(screen.getByTestId('legacy-right')).toBeInTheDocument()
      
          await waitFor(() => {
            const rightPane = getRightPane()
            expect(rightPane).not.toBeNull()
            expect(rightPane?.style.width).toBe('320px')
          })
        })
      })

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-layout/index.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-layout/index.tsx
    lang: tsx
    template: |
      'use client'
      
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      import { generateUtilityClasses } from '@/registry/default/lib/class-generator'
      
      const layoutClasses = generateUtilityClasses('workbench-layout', [
        'root',
        'left',
        'toggle',
        'toggle-button',
        'toggle-icon',
        'right',
      ])
      
      type ToggleLabels = {
        /** 当右侧区域折叠时，点击用于展开的无障碍文案 */
        expand?: string
        /** 当右侧区域展开时，点击用于折叠的无障碍文案 */
        collapse?: string
      }
      
      export interface WorkbenchLayoutProps {
        /** 左侧内容区域（优先于 children 的第一个节点） */
        left?: React.ReactNode
        /** 右侧内容区域（优先于 children 的第二个节点） */
        right?: React.ReactNode
        /** 子节点（顺序：左/右）。若同时传入 left/right，会优先生效 */
        children?: React.ReactNode
        /** 根节点额外类名 */
        className?: string
        /** 左侧内容区域类名 */
        leftClassName?: string
        /** 右侧内容区域类名 */
        rightClassName?: string
        /** 切换按钮容器类名 */
        toggleClassName?: string
        /** 右侧区域宽度，默认 320px */
        sidebarWidth?: number | string
        /** 触发折叠的断点，默认 1366px */
        breakpoint?: number
        /** 当处于窄屏时的初始折叠状态，默认 true */
        defaultCollapsedOnNarrow?: boolean
        /** 受控折叠状态 */
        collapsed?: boolean
        /** 折叠状态变更回调 */
        onCollapsedChange?: (collapsed: boolean) => void
        /** 切换按钮的文案 */
        toggleLabels?: ToggleLabels
      }
      
      type WorkbenchLayoutChild = Exclude<React.ReactNode, boolean | null | undefined>
      
      const DEFAULT_BREAKPOINT = 1366
      const DEFAULT_SIDEBAR_WIDTH = 320
      const DEFAULT_TOGGLE_LABELS: Required<ToggleLabels> = {
        expand: '展开右侧容器',
        collapse: '收起右侧容器',
      }
      
      const toCssSize = (value: number | string | undefined, fallback: number) => {
        if (typeof value === 'number') {
          return `${value}px`
        }
        if (typeof value === 'string' && value.trim().length > 0) {
          return value
        }
        return `${fallback}px`
      }
      
      const IconPill = ({
        direction,
        className,
      }: {
        direction: 'left' | 'right'
        className?: string
      }) => {
        const transform =
          direction === 'left' ? undefined : 'translate(12 0) scale(-1 1)'
      
        return (
          <svg
            className={className}
            fill="none"
            height="40"
            viewBox="0 0 12 40"
            width="12"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform={transform}>
              <path
                d="M10.3174 2.74707C11.0073 2.89656 11.4999 3.50694 11.5 4.21289V35.7871C11.4999 36.4931 11.0073 37.1034 10.3174 37.2529L0.5 39.3799V0.619141L10.3174 2.74707Z"
                fill="var(--workbench-layout-toggle-surface,var(--color-card))"
                stroke="var(--workbench-layout-toggle-border,var(--color-gray-3))"
              />
              <rect
                fill="var(--workbench-layout-toggle-surface,var(--color-card))"
                height="10"
                rx="3"
                transform="rotate(-90 1 25)"
                width="10"
                x="1"
                y="25"
              />
              <path
                d="M5.28874 22.4351L7.80191 20.1605C7.89941 20.0725 7.89941 19.9275 7.80191 19.8395L5.28874 17.5645C5.13474 17.4253 4.875 17.526 4.875 17.7253L4.875 22.2746C4.875 22.4739 5.13474 22.5749 5.28874 22.4351Z"
                fill="var(--workbench-layout-toggle-icon,var(--color-gray-7))"
              />
            </g>
          </svg>
        )
      }
      
      // eslint-disable-next-line react/display-name
      const WorkbenchLayout = React.forwardRef<
        HTMLButtonElement,
        WorkbenchLayoutProps
      >((props, forwardedRef) => {
        const {
          left,
          right,
          children,
          className,
          leftClassName,
          rightClassName,
          toggleClassName,
          sidebarWidth,
          breakpoint = DEFAULT_BREAKPOINT,
          defaultCollapsedOnNarrow = true,
          collapsed: collapsedProp,
          onCollapsedChange,
          toggleLabels,
        } = props
      
        const childSlots = React.useMemo<WorkbenchLayoutChild[]>(() => {
          if (!children) return []
          return React.Children.toArray(children).filter(
            (child): child is WorkbenchLayoutChild =>
              child !== null && child !== undefined && typeof child !== 'boolean'
          )
        }, [children])
      
        const resolvedLeft = left ?? childSlots[0] ?? null
        const resolvedRight = right ?? childSlots[1] ?? null
      
        const [internalCollapsed, setInternalCollapsed] = React.useState(() => {
          if (typeof window === 'undefined') {
            return false
          }
          const narrow = window.innerWidth <= breakpoint
          return narrow ? defaultCollapsedOnNarrow : false
        })
        const [isNarrow, setIsNarrow] = React.useState(() => {
          if (typeof window === 'undefined') {
            return false
          }
          return window.innerWidth <= breakpoint
        })
        const hasInteractedRef = React.useRef(false)
        const contentId = React.useId()
        const lastNotifiedCollapsedRef = React.useRef<boolean | null>(null)
      
        const resolvedCollapsedProp =
          typeof collapsedProp === 'boolean' ? collapsedProp : undefined
        const resolvedOnCollapsedChange = onCollapsedChange
      
        const isControlled = typeof resolvedCollapsedProp === 'boolean'
        const mergedLabels = React.useMemo(
          () => ({ ...DEFAULT_TOGGLE_LABELS, ...toggleLabels }),
          [toggleLabels]
        )
      
        const resolvedSidebarWidth = React.useMemo(
          () => toCssSize(sidebarWidth, DEFAULT_SIDEBAR_WIDTH),
          [sidebarWidth]
        )
      
        const resolvedCollapsed = isControlled
          ? (resolvedCollapsedProp as boolean)
          : internalCollapsed
        const collapsed = resolvedCollapsed && isNarrow
        const hasRightSlot = Boolean(resolvedRight)
      
        const setCollapsedState = React.useCallback(
          (next: boolean) => {
            if (isControlled) {
              resolvedOnCollapsedChange?.(next)
              return
            }
            hasInteractedRef.current = true
            setInternalCollapsed(next)
          },
          [isControlled, resolvedOnCollapsedChange]
        )
      
        React.useEffect(() => {
          if (typeof window === 'undefined' || !hasRightSlot) {
            return
          }
      
          let frame = 0
          const requestFrame =
            typeof window.requestAnimationFrame === 'function'
              ? window.requestAnimationFrame.bind(window)
              : (callback: FrameRequestCallback) =>
                  window.setTimeout(() => callback(performance.now()), 16)
      
          const cancelFrame =
            typeof window.cancelAnimationFrame === 'function'
              ? window.cancelAnimationFrame.bind(window)
              : window.clearTimeout
      
          const evaluate = () => {
            frame = requestFrame(() => {
              const narrow = window.innerWidth <= breakpoint
              setIsNarrow(narrow)
      
              if (!isControlled) {
                setInternalCollapsed((previous) => {
                  if (narrow) {
                    if (hasInteractedRef.current) {
                      return previous
                    }
                    return defaultCollapsedOnNarrow
                  }
      
                  hasInteractedRef.current = false
                  return false
                })
              }
            })
          }
      
          evaluate()
          window.addEventListener('resize', evaluate)
      
          return () => {
            window.removeEventListener('resize', evaluate)
            if (frame) {
              cancelFrame(frame)
            }
          }
        }, [breakpoint, defaultCollapsedOnNarrow, hasRightSlot, isControlled])
      
        const handleToggle = React.useCallback(() => {
          if (!hasRightSlot || !isNarrow) {
            return
          }
      
          const target = !resolvedCollapsed
          setCollapsedState(target)
        }, [resolvedCollapsed, hasRightSlot, isNarrow, setCollapsedState])
      
        React.useEffect(() => {
          if (isControlled || !hasRightSlot) {
            return
          }
      
          if (lastNotifiedCollapsedRef.current === internalCollapsed) {
            return
          }
      
          lastNotifiedCollapsedRef.current = internalCollapsed
          onCollapsedChange?.(internalCollapsed)
        }, [hasRightSlot, internalCollapsed, isControlled, onCollapsedChange])
      
        const rightStyle = React.useMemo<React.CSSProperties>(() => {
          if (!hasRightSlot) {
            return { width: 0, flexBasis: 0 }
          }
      
          return collapsed
            ? { width: 0, flexBasis: 0 }
            : { width: resolvedSidebarWidth, flexBasis: resolvedSidebarWidth }
        }, [collapsed, hasRightSlot, resolvedSidebarWidth])
      
        const showToggle = hasRightSlot
        const buttonLabel = collapsed ? mergedLabels.expand : mergedLabels.collapse
        return (
          <div
            className={cn(
              'flex h-full w-full min-w-[1280px] items-stretch overflow-x-auto',
              className
            )}
            data-ui-slot={layoutClasses.root}
          >
            <div
              className={cn('min-w-0 flex-1', leftClassName)}
              data-ui-slot={layoutClasses.left}
            >
              {resolvedLeft}
            </div>
      
            <div
              aria-hidden={!showToggle}
              className={cn(
                'flex h-full w-3 items-center justify-center',
                showToggle ? 'opacity-100' : 'opacity-0',
                toggleClassName
              )}
              data-ui-slot={layoutClasses.toggle}
            >
              {hasRightSlot ? (
                <button
                  ref={forwardedRef}
                  aria-controls={contentId}
                  aria-expanded={!collapsed}
                  aria-label={buttonLabel}
                  className={cn(
                    'flex h-24 w-full items-center justify-center transition-opacity duration-200',
                    showToggle ? 'pointer-events-auto' : 'pointer-events-none'
                  )}
                  data-ui-slot={layoutClasses['toggle-button']}
                  disabled={!showToggle}
                  type="button"
                  onClick={handleToggle}
                >
                  <IconPill direction={collapsed ? 'right' : 'left'} />
                </button>
              ) : null}
            </div>
      
            <div
              aria-hidden={collapsed}
              className={cn(
                'flex h-full shrink-0 overflow-hidden transition-[opacity,width] duration-200 ease-in-out',
                collapsed ? 'opacity-0' : 'opacity-100',
                rightClassName
              )}
              data-ui-slot={layoutClasses.right}
              id={contentId}
              style={rightStyle}
            >
              <div className="flex h-full w-full">{resolvedRight}</div>
            </div>
          </div>
        )
      })
      
      WorkbenchLayout.displayName = 'WorkbenchLayout'
      
      export { WorkbenchLayout }
      export type { ToggleLabels as WorkbenchLayoutToggleLabels }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-layout/meta.json
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-layout/meta.json
    lang: json
    template: |
      {
        "dependencies": [],
        "registryDependencies": ["class-generator"],
        "tags": [
          "layout",
          "container",
          "split",
          "responsive",
          "workbench",
          "折叠",
          "展开",
          "双栏",
          "workbench-layout"
        ]
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-right/__tests__/index.test.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-right/__tests__/index.test.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      import { cleanup, render, screen } from '@testing-library/react'
      import { afterEach, describe, expect, it, vi } from 'vitest'
      import { axe } from 'vitest-axe'
      
      import { useWorkbenchStore } from '@/registry/default/templates/workbench/stores/index.store'
      
      import {
        WorkbenchRight,
        useWorkbenchRightStatus,
        type WorkbenchRightContentStatus,
        type WorkbenchRightProps,
      } from '../index'
      
      vi.mock('@/lib/utils', () => ({
        cn: vi.fn((...args: unknown[]) =>
          args
            .flatMap((arg) => {
              if (!arg) return []
              if (typeof arg === 'string') return [arg]
              if (typeof arg === 'object') {
                return Object.entries(arg)
                  .filter(([, value]) => Boolean(value))
                  .map(([key]) => key)
              }
              return [String(arg)]
            })
            .join(' ')
        ),
      }))
      
      vi.mock('@/registry/default/lib/class-generator', () => ({
        generateUtilityClasses: vi.fn((name: string, slots: string[]) =>
          slots.reduce<Record<string, string>>((acc, slot) => {
            acc[slot] = `${name}-${slot}`
            return acc
          }, {})
        ),
      }))
      
      describe('WorkbenchRight', () => {
        afterEach(() => {
          cleanup()
          vi.clearAllMocks()
          useWorkbenchStore.getState().rightPanel.reset()
        })
      
        const setup = (
          props?: Partial<WorkbenchRightProps> & { children?: React.ReactNode }
        ) => {
          const defaultChildren = (
            <>
              <div>用户卡片</div>
              <div>右侧内容</div>
            </>
          )
      
          const { children, ...rest } = props || {}
          return render(
            <WorkbenchRight {...rest}>{children ?? defaultChildren}</WorkbenchRight>
          )
        }
      
        it('should render top and content sections', () => {
          const { container } = setup()
      
          expect(screen.getByText('用户卡片')).toBeInTheDocument()
          expect(screen.getByText('右侧内容')).toBeInTheDocument()
          expect(container.firstElementChild).toHaveAttribute(
            'data-ui-slot',
            'workbench-right-root'
          )
        })
      
        it('should treat children order as top then content', () => {
          const { container } = render(
            <WorkbenchRight>
              <div>top child</div>
              <div>content child</div>
            </WorkbenchRight>
          )
      
          const topSlot = container.querySelector(
            '[data-ui-slot="workbench-right-top"]'
          )
          const contentSlot = container.querySelector(
            '[data-ui-slot="workbench-right-content"]'
          )
      
          expect(topSlot).toHaveTextContent('top child')
          expect(contentSlot).toHaveTextContent('content child')
        })
      
        it('should fallback to children when only content is provided', () => {
          const { container } = render(
            <WorkbenchRight>
              <div>仅有内容</div>
            </WorkbenchRight>
          )
      
          expect(
            container.querySelector('[data-ui-slot="workbench-right-top"]')
          ).toBeNull()
          expect(screen.getByText('仅有内容')).toBeInTheDocument()
        })
      
        it('should expose compound Title with decorative icons', () => {
          const { container } = render(
            <WorkbenchRight.Title>分拨中心</WorkbenchRight.Title>
          )
          expect(screen.getByText('分拨中心')).toBeInTheDocument()
          expect(
            container.querySelectorAll(
              '[data-ui-slot="workbench-right-title-decoration"]'
            )
          ).toHaveLength(2)
        })
      
        it('should render subtitle with divider', () => {
          const { container } = render(
            <WorkbenchRight.SubTitle>进行中的任务</WorkbenchRight.SubTitle>
          )
          expect(
            container.querySelector('[data-ui-slot="workbench-right-subtitle"]')
          ).toBeInTheDocument()
          expect(
            container.querySelector(
              '[data-ui-slot="workbench-right-subtitle-divider"]'
            )
          ).toBeInTheDocument()
        })
      
        it('should have no accessibility violations', async () => {
          const { container } = setup()
          const result = await axe(container)
          expect(result).toHaveNoViolations()
        })
      
        it('should allow passing top and content via props for backward compatibility', () => {
          render(
            <WorkbenchRight
              top={<div>props 顶部</div>}
              content={<div>props 主体</div>}
            />
          )
      
          expect(screen.getByText('props 顶部')).toBeInTheDocument()
          expect(screen.getByText('props 主体')).toBeInTheDocument()
        })
      
        it('should merge custom class names for top/content containers', () => {
          const { container } = render(
            <WorkbenchRight
              topClassName="custom-top"
              contentInnerClassName="custom-content"
            >
              <div>顶部</div>
              <div>主体</div>
            </WorkbenchRight>
          )
      
          const topContainer = container.querySelector(
            '[data-ui-slot="workbench-right-top"]'
          )
          const contentContainer = container.querySelector(
            '[data-ui-slot="workbench-right-content"]'
          )
      
          expect(topContainer?.className).toContain('custom-top')
          expect(contentContainer?.className).toContain('custom-content')
        })
      
        it('should update content status via context setter', () => {
          const StatusDriver = ({
            status,
          }: {
            status: WorkbenchRightContentStatus
          }) => {
            const { setContentStatus } = useWorkbenchRightStatus()
            React.useEffect(() => {
              setContentStatus(status)
            }, [setContentStatus, status])
            return null
          }
      
          const { container } = render(
            <WorkbenchRight>
              <div>顶部</div>
              <>
                <StatusDriver status="warning" />
                <div>主体内容</div>
              </>
            </WorkbenchRight>
          )
      
          const contentSlot = container.querySelector(
            '[data-ui-slot="workbench-right-content"]'
          )
          expect(contentSlot?.className).toContain('from-orange-200')
        })
      
        it('should respect controlled contentStatus prop', () => {
          const { container } = render(
            <WorkbenchRight contentStatus="error">
              <div>顶部</div>
              <div>主体内容</div>
            </WorkbenchRight>
          )
          const contentSlot = container.querySelector(
            '[data-ui-slot="workbench-right-content"]'
          )
          expect(contentSlot?.className).toContain('from-rose-200')
        })
      })

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-right/index.PROMPT.md
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-right/index.PROMPT.md
    lang: md
    template: |
      说明
      
      - 工作台右侧信息面板容器，承载顶部概览区与主体详情区，支持滚动与主题自定义变量
      
      变体
      
      ```tsx
      import { WorkbenchRight } from '@/components/ui/workbench-right'
      
      ;<WorkbenchRight>
        <div className="space-y-1">
          <WorkbenchRight.Title>揽收任务概览</WorkbenchRight.Title>
          <WorkbenchRight.SubTitle>今日进度</WorkbenchRight.SubTitle>
        </div>
        <div className="space-y-3 p-4">
          <section className="rounded-lg bg-[color:var(--color-gray-1)] p-3 text-sm text-[color:var(--color-gray-13)]">
            配载完成 26 单，正在揽收 4 单。
          </section>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>待取件：12</span>
            <span>异常处理中：3</span>
            <span>今日完成：68%</span>
            <span>昨日完成：92%</span>
          </div>
        </div>
      </WorkbenchRight>
      ```
      
      注意
      
      - 默认按照 children 顺序切分：第一个节点进入顶部区，其余节点进入主体区；`top` / `content` props 仍可用于兼容旧代码
      - 顶部区域适合放置用户卡片或指标摘要，可通过 `topClassName` 调整排版
      - `contentClassName` / `contentInnerClassName` 允许控制滚动策略与内间距
      - 主题变量 `--workbench-right-*` 可统一改写边框、标题、分割线等颜色

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-right/index.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-right/index.tsx
    lang: tsx
    template: |
      'use client'
      
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      import { generateUtilityClasses } from '@/registry/default/lib/class-generator'
      import type { WorkbenchRightContentStatus } from '@/registry/default/templates/workbench/types'
      
      const workbenchRightClasses = generateUtilityClasses('workbench-right', [
        'root',
        'top',
        'panel',
        'content',
        'title',
        'title-inner',
        'title-decoration',
        'subtitle',
        'subtitle-divider',
      ])
      
      const DECORATION_COLORS = {
        primary: 'var(--workbench-right-decoration-primary,var(--color-primary-4))',
        secondary:
          'var(--workbench-right-decoration-secondary,var(--color-primary-2))',
      } as const
      
      const CONTENT_STATUS_CLASSES: Record<WorkbenchRightContentStatus, string> = {
        normal: 'bg-gradient-to-b from-emerald-100 to-emerald-100/20',
        warning: 'bg-gradient-to-b from-orange-200 to-orange-100',
        error: 'bg-gradient-to-b from-rose-200 to-rose-200/20',
      }
      
      type WorkbenchRightBaseProps = React.HTMLAttributes<HTMLDivElement>
      
      type WorkbenchChild = Exclude<React.ReactNode, boolean | null | undefined>
      
      interface WorkbenchRightProps extends Omit<WorkbenchRightBaseProps, 'content'> {
        /** 顶部概览区块，常用于渲染用户卡片或指标 */
        top?: React.ReactNode
        /** 右侧主体内容，未传入时回退到 children */
        content?: React.ReactNode
        /** 顶部容器的额外 className */
        topClassName?: string
        /** 外层内容容器的 className */
        contentClassName?: string
        /** 外层内容容器的内联样式 */
        contentStyle?: React.CSSProperties
        /** 内部内容区的 className，可用于控制布局与间距 */
        contentInnerClassName?: string
        /**
         * 内容区状态，决定背景色。
         * 默认值为 'normal'，传入该属性可覆写。
         */
        contentStatus?: WorkbenchRightContentStatus
      }
      
      interface WorkbenchRightTitleProps {
        children?: React.ReactNode
        className?: string
        textClassName?: string
      }
      
      interface WorkbenchRightSubTitleProps {
        children?: React.ReactNode
        className?: string
        dividerClassName?: string
      }
      
      const TitleDecoration = ({ className }: { className?: string }) => (
        <svg
          aria-hidden="true"
          className={cn(
            'h-[12px] w-[16px] shrink-0',
            workbenchRightClasses['title-decoration'],
            className
          )}
          data-ui-slot={workbenchRightClasses['title-decoration']}
          fill="none"
          height="12"
          viewBox="0 0 16 12"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3114 2.21896C4.72562 1.50152 5.643 1.25571 6.36044 1.66992C7.07788 2.08414 7.32369 3.00152 6.90948 3.71896L3.40948 9.78114C2.99526 10.4986 2.07788 10.7444 1.36044 10.3302C0.643001 9.91596 0.397188 8.99858 0.811401 8.28114L4.3114 2.21896Z"
            fill={DECORATION_COLORS.primary}
            opacity="0.6"
          />
          <path
            d="M11.0076 9.78104C10.5933 10.4985 9.67595 10.7443 8.95852 10.3301C8.24108 9.91586 7.99526 8.99848 8.40948 8.28104L11.9095 2.21886C12.3237 1.50142 13.2411 1.25561 13.9585 1.66982C14.676 2.08404 14.9218 3.00142 14.5076 3.71886L11.0076 9.78104Z"
            fill={DECORATION_COLORS.secondary}
            opacity="0.4"
          />
        </svg>
      )
      
      const WorkbenchRightTitle = ({
        children,
        className,
        textClassName,
      }: WorkbenchRightTitleProps) => (
        <div
          className={cn(
            'relative flex items-center justify-center gap-2 py-1 text-base font-bold leading-6 text-[color:var(--workbench-right-title-color,var(--color-gray-13))]',
            workbenchRightClasses.title,
            className
          )}
          data-ui-slot={workbenchRightClasses.title}
        >
          <TitleDecoration />
          <span
            className={cn(
              'relative z-[1] inline-flex min-h-[24px] items-center rounded-full bg-[color:var(--workbench-right-title-background,var(--color-card))]',
              workbenchRightClasses['title-inner'],
              textClassName
            )}
            data-ui-slot={workbenchRightClasses['title-inner']}
          >
            {children}
          </span>
          <TitleDecoration />
        </div>
      )
      
      WorkbenchRightTitle.displayName = 'WorkbenchRightTitle'
      
      const WorkbenchRightSubTitle = ({
        children,
        className,
        dividerClassName,
      }: WorkbenchRightSubTitleProps) => (
        <div
          className={cn(
            'flex items-center text-xs font-semibold leading-5 text-[color:var(--workbench-right-subtitle-color,var(--color-gray-13))]',
            workbenchRightClasses.subtitle,
            className
          )}
          data-ui-slot={workbenchRightClasses.subtitle}
        >
          <span className="truncate">{children}</span>
          <span
            aria-hidden="true"
            className={cn(
              'ml-2 h-px flex-1 bg-[color:var(--workbench-right-divider-color,var(--color-gray-3))]',
              workbenchRightClasses['subtitle-divider'],
              dividerClassName
            )}
            data-ui-slot={workbenchRightClasses['subtitle-divider']}
          />
        </div>
      )
      
      WorkbenchRightSubTitle.displayName = 'WorkbenchRightSubTitle'
      
      type WorkbenchRightComponent = React.ForwardRefExoticComponent<
        WorkbenchRightProps & React.RefAttributes<HTMLDivElement>
      > & {
        Title: typeof WorkbenchRightTitle
        SubTitle: typeof WorkbenchRightSubTitle
      }
      
      const WorkbenchRight = React.forwardRef<HTMLDivElement, WorkbenchRightProps>(
        (props, forwardedRef) => {
          const {
            top,
            content,
            children,
            className,
            topClassName,
            contentClassName,
            contentStyle,
            contentInnerClassName,
            contentStatus: contentStatusProp,
            ...rest
          } = props
      
          const childSlots = React.useMemo<WorkbenchChild[]>(() => {
            if (!children) return []
            return React.Children.toArray(children).filter(
              (child): child is WorkbenchChild =>
                child !== null && child !== undefined && typeof child !== 'boolean'
            )
          }, [children])
      
          let fallbackTop: React.ReactNode = null
          let fallbackContent: React.ReactNode = null
      
          if (childSlots.length > 1) {
            fallbackTop = childSlots[0]
            const restSlots = childSlots.slice(1)
            fallbackContent = restSlots.length > 1 ? restSlots : restSlots[0]
          } else if (childSlots.length === 1) {
            fallbackContent = childSlots[0]
          }
      
          const topNode = top ?? fallbackTop
          const contentNode = content ?? fallbackContent
      
          const contentStatus: WorkbenchRightContentStatus =
            contentStatusProp ?? 'normal'
      
          const contentStatusClassName =
            CONTENT_STATUS_CLASSES[contentStatus] ?? CONTENT_STATUS_CLASSES.normal
          const hasTop = Boolean(topNode)
      
          return (
            <div
              ref={forwardedRef}
              className={cn(
                'flex h-full min-h-0 w-full flex-col gap-2',
                workbenchRightClasses.root,
                className
              )}
              data-ui-slot={workbenchRightClasses.root}
              {...rest}
            >
              {hasTop ? (
                <div
                  className={cn(
                    'flex flex-col gap-2',
                    workbenchRightClasses.top,
                    topClassName
                  )}
                  data-ui-slot={workbenchRightClasses.top}
                >
                  {topNode}
                </div>
              ) : null}
      
              <div
                className={cn(
                  'relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-[color:var(--workbench-right-border-color,var(--color-gray-3))] bg-[color:var(--workbench-right-background,var(--color-card))] shadow-[var(--workbench-right-shadow,var(--shadow-1))]',
                  workbenchRightClasses.panel,
                  contentClassName
                )}
                data-ui-slot={workbenchRightClasses.panel}
                style={contentStyle}
              >
                <div
                  className={cn(
                    'flex h-full w-full flex-col gap-2 overflow-auto',
                    contentStatusClassName,
                    workbenchRightClasses.content,
                    contentInnerClassName
                  )}
                  data-ui-slot={workbenchRightClasses.content}
                >
                  {contentNode}
                </div>
              </div>
            </div>
          )
        }
      ) as WorkbenchRightComponent
      
      WorkbenchRight.displayName = 'WorkbenchRight'
      WorkbenchRight.Title = WorkbenchRightTitle
      WorkbenchRight.SubTitle = WorkbenchRightSubTitle
      
      export { WorkbenchRight }
      export type {
        WorkbenchRightContentStatus,
        WorkbenchRightProps,
        WorkbenchRightSubTitleProps,
        WorkbenchRightTitleProps,
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-right/meta.json
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-right/meta.json
    lang: json
    template: |
      {
        "registryDependencies": ["class-generator"],
        "tags": [
          "workbench",
          "panel",
          "right-pane",
          "layout",
          "summary-container",
          "工作台",
          "右侧面板",
          "布局容器"
        ]
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-table-full-screen/controller.ts
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-table-full-screen/controller.ts
    lang: ts
    template: |
      'use client'
      
      import * as React from 'react'
      
      type NativeButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>
      
      export type ButtonRestProps = Omit<NativeButtonProps, 'onClick'>
      
      export type ResolvedButtonProps = ButtonRestProps & {
        onClick?: NativeButtonProps['onClick']
      }
      
      export type FullScreenTarget =
        | string
        | HTMLElement
        | (() => HTMLElement | null)
        | React.RefObject<HTMLElement | null>
        | null
        | undefined
      
      export interface FullScreenHandlerContext {
        target: HTMLElement | null
        event: React.MouseEvent<HTMLButtonElement>
      }
      
      interface UseFullscreenManagerOptions {
        buttonProps?: ResolvedButtonProps
        disabled?: boolean
        fullScreenTarget?: FullScreenTarget
        fullScreenId?: string
        requestFullscreenOptions?: FullscreenOptions
        mode: 'enter' | 'toggle'
        onEnterFullScreen?: (
          context: FullScreenHandlerContext
        ) => void | Promise<void>
        onExitFullScreen?: (context: FullScreenHandlerContext) => void | Promise<void>
        onFullScreenChange?: (isFullscreen: boolean, target: Element | null) => void
        onError?: (error: unknown) => void
      }
      
      interface FullscreenManagerResult {
        isFullscreen: boolean
        handleClick: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>
        buttonPropsOnClick?: NativeButtonProps['onClick']
        restButtonProps: ButtonRestProps
      }
      
      const isRefObject = (
        target: FullScreenTarget
      ): target is React.RefObject<HTMLElement | null> => {
        return Boolean(target && typeof target === 'object' && 'current' in target)
      }
      
      const findElementByString = (selector: string) => {
        if (typeof document === 'undefined') {
          return null
        }
      
        const trimmed = selector.trim()
        if (!trimmed) {
          return null
        }
      
        const idCandidate = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
        const byId = document.getElementById(idCandidate)
        if (byId) {
          return byId
        }
      
        try {
          return document.querySelector(trimmed) as HTMLElement | null
        } catch {
          return null
        }
      }
      
      const matchesTarget = (
        target: HTMLElement | null,
        element: Element | null
      ): boolean => {
        if (!target || !element) {
          return false
        }
        if (target === element) {
          return true
        }
        if ('contains' in target && target.contains(element)) {
          return true
        }
        if ('contains' in element && element.contains(target)) {
          return true
        }
        return false
      }
      
      const resolveButtonProps = (
        buttonProps?: ResolvedButtonProps
      ): {
        onClick?: NativeButtonProps['onClick']
        rest: ButtonRestProps
      } => {
        if (!buttonProps) {
          return { onClick: undefined, rest: {} as ButtonRestProps }
        }
      
        const { onClick, ...rest } = buttonProps
        return { onClick, rest }
      }
      
      export function useFullscreenManager(
        options: UseFullscreenManagerOptions
      ): FullscreenManagerResult {
        const {
          buttonProps,
          disabled,
          fullScreenTarget,
          fullScreenId,
          onEnterFullScreen,
          onExitFullScreen,
          onFullScreenChange,
          onError,
          requestFullscreenOptions,
          mode,
        } = options
      
        const parsedButtonProps = React.useMemo(
          () => resolveButtonProps(buttonProps),
          [buttonProps]
        )
      
        const computeTarget = React.useCallback(() => {
          if (typeof document === 'undefined') {
            return null
          }
      
          if (typeof fullScreenTarget === 'string') {
            const element = findElementByString(fullScreenTarget)
            if (element) {
              return element
            }
          } else if (typeof fullScreenTarget === 'function') {
            try {
              const element = fullScreenTarget()
              if (element) {
                return element
              }
            } catch (error) {
              onError?.(error)
            }
          } else if (
            fullScreenTarget instanceof HTMLElement ||
            fullScreenTarget instanceof Element
          ) {
            return fullScreenTarget as HTMLElement
          } else if (isRefObject(fullScreenTarget)) {
            return fullScreenTarget.current
          }
      
          if (fullScreenId) {
            return findElementByString(fullScreenId)
          }
      
          return null
        }, [fullScreenTarget, fullScreenId, onError])
      
        const [isFullscreen, setIsFullscreen] = React.useState(false)
        const lastRequestedTargetRef = React.useRef<HTMLElement | null>(null)
      
        const syncFullscreenState = React.useCallback(() => {
          if (typeof document === 'undefined') {
            return
          }
      
          const current = document.fullscreenElement
          const target =
            lastRequestedTargetRef.current ??
            computeTarget() ??
            document.fullscreenElement
      
          const active = matchesTarget(target as HTMLElement | null, current)
          setIsFullscreen(active)
      
          onFullScreenChange?.(active, current)
      
          if (!active && !current) {
            lastRequestedTargetRef.current = null
          }
        }, [computeTarget, onFullScreenChange])
      
        React.useEffect(() => {
          if (typeof document === 'undefined') {
            return
          }
      
          const handleChange = () => {
            syncFullscreenState()
          }
      
          document.addEventListener('fullscreenchange', handleChange)
          document.addEventListener(
            'webkitfullscreenchange',
            handleChange as EventListener
          )
      
          syncFullscreenState()
      
          return () => {
            document.removeEventListener('fullscreenchange', handleChange)
            document.removeEventListener(
              'webkitfullscreenchange',
              handleChange as EventListener
            )
          }
        }, [syncFullscreenState])
      
        const handleClick = React.useCallback(
          async (event: React.MouseEvent<HTMLButtonElement>) => {
            parsedButtonProps.onClick?.(event)
            if (event.defaultPrevented) {
              return
            }
      
            if (disabled) {
              event.preventDefault()
              return
            }
      
            const target = computeTarget()
            lastRequestedTargetRef.current = target
      
            const invokeError = (error: unknown) => {
              if (onError) {
                onError(error)
              } else if (process.env.NODE_ENV !== 'production') {
                console.error('[ProWorkbenchTableFullScreen]', error)
              }
            }
      
            const handleEnter = async () => {
              if (onEnterFullScreen) {
                await onEnterFullScreen({ target, event })
                return
              }
      
              if (!target) {
                invokeError(
                  new Error(
                    'ProWorkbenchTableFullScreen: 未找到可用的全屏目标，请检查 fullScreenId/fullScreenTarget 配置'
                  )
                )
                return
              }
      
              try {
                if (typeof target.requestFullscreen === 'function') {
                  await target.requestFullscreen(requestFullscreenOptions)
                  return
                }
      
                const legacy = (
                  target as HTMLElement & {
                    webkitRequestFullscreen?: (
                      options?: FullscreenOptions
                    ) => Promise<void>
                  }
                ).webkitRequestFullscreen
      
                if (typeof legacy === 'function') {
                  await legacy.call(target, requestFullscreenOptions)
                  return
                }
      
                invokeError(
                  new Error('ProWorkbenchTableFullScreen: 当前浏览器不支持全屏 API')
                )
              } catch (error) {
                invokeError(error)
              }
            }
      
            const handleExit = async () => {
              if (onExitFullScreen) {
                await onExitFullScreen({ target, event })
                return
              }
      
              if (typeof document !== 'undefined' && document.exitFullscreen) {
                try {
                  await document.exitFullscreen()
                } catch (error) {
                  invokeError(error)
                }
              }
            }
      
            if (mode === 'toggle' && isFullscreen) {
              await handleExit()
              return
            }
      
            await handleEnter()
          },
          [
            parsedButtonProps,
            disabled,
            computeTarget,
            onEnterFullScreen,
            onExitFullScreen,
            onError,
            requestFullscreenOptions,
            mode,
            isFullscreen,
          ]
        )
      
        return {
          isFullscreen,
          handleClick,
          buttonPropsOnClick: parsedButtonProps.onClick,
          restButtonProps: parsedButtonProps.rest,
        }
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-table-full-screen/index.PROMPT.md
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-table-full-screen/index.PROMPT.md
    lang: md
    template: |
      说明
      
      - 在工作台页眉放置全屏按钮，配合标题/描述快速切换表格内容进入全屏
      
      变体
      
      ```tsx
      import { ProWorkbenchTableFullScreen } from '@/components/ui/workbench-table-full-screen'
      
      ;<ProWorkbenchTableFullScreen
        title="运单工作台"
        description="支持在窄屏与大屏之间切换展示"
        fullScreenId="workbench-table"
        hotkeyHint="F"
      />
      ```
      
      注意
      
      - `fullScreenId` 或 `fullScreenTarget` 至少提供一个，否则组件无法定位需要进入全屏的 DOM
      - 默认 `mode="toggle"`，再次点击会退出全屏，可通过 `mode="enter"` 固定为单向
      - 浏览器全屏 API 若失败会触发 `onError` 回调，记得提示用户或写日志
      - 若业务里另行控制全屏状态，可监听 `onFullScreenChange` 统一管理 UI 状态

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-table-full-screen/index.test.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-table-full-screen/index.test.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      import {
        cleanup,
        fireEvent,
        render,
        screen,
        waitFor,
      } from '@testing-library/react'
      import userEvent from '@testing-library/user-event'
      import {
        afterAll,
        afterEach,
        beforeAll,
        beforeEach,
        describe,
        expect,
        it,
        vi,
      } from 'vitest'
      
      import { ProWorkbenchTableFullScreen } from './index'
      
      type FullscreenCapableElement = HTMLElement & {
        requestFullscreen: ReturnType<typeof vi.fn>
      }
      
      const createTarget = (id: string): FullscreenCapableElement => {
        const element = document.createElement('div') as FullscreenCapableElement
        element.id = id
        element.requestFullscreen = vi.fn().mockResolvedValue(undefined)
        document.body.appendChild(element)
        return element
      }
      
      describe('ProWorkbenchTableFullScreen', () => {
        const originalExitFullscreen = document.exitFullscreen
        const docWithFullscreen = document as Document & {
          fullscreenElement: Element | null
        }
      
        beforeAll(() => {
          Object.defineProperty(document, 'fullscreenElement', {
            configurable: true,
            writable: true,
            value: null,
          })
        })
      
        beforeEach(() => {
          vi.restoreAllMocks()
          docWithFullscreen.fullscreenElement = null
          document.exitFullscreen = vi.fn().mockResolvedValue(undefined) as any
        })
      
        afterEach(() => {
          cleanup()
          docWithFullscreen.fullscreenElement = null
        })
      
        afterAll(() => {
          document.exitFullscreen = originalExitFullscreen
        })
      
        it('should expose a display name', () => {
          expect(ProWorkbenchTableFullScreen.displayName).toBe(
            'ProWorkbenchTableFullScreen'
          )
        })
      
        it('should render title and description', () => {
          render(
            <ProWorkbenchTableFullScreen
              title="运单工作台"
              description="支持一键全屏展示"
            />
          )
      
          expect(screen.getByText('运单工作台')).toBeInTheDocument()
          expect(screen.getByText('支持一键全屏展示')).toBeInTheDocument()
        })
      
        it('should request fullscreen for the resolved target by id', async () => {
          const user = userEvent.setup()
          const target = createTarget('workbench')
      
          render(
            <ProWorkbenchTableFullScreen title="标题" fullScreenId="workbench" />
          )
      
          const button = screen.getByRole('button', { name: '全屏' })
          await user.click(button)
      
          expect(target.requestFullscreen).toHaveBeenCalledTimes(1)
      
          target.remove()
        })
      
        it('should use custom enter handler when provided', async () => {
          const user = userEvent.setup()
          const target = createTarget('custom')
          const handleEnter = vi.fn()
      
          render(
            <ProWorkbenchTableFullScreen
              title="标题"
              fullScreenTarget={() => target}
              onEnterFullScreen={({ target: resolved }) => handleEnter(resolved)}
            />
          )
      
          const button = screen.getByRole('button', { name: '全屏' })
          await user.click(button)
      
          expect(handleEnter).toHaveBeenCalledTimes(1)
          expect(handleEnter).toHaveBeenCalledWith(target)
          expect(target.requestFullscreen).not.toHaveBeenCalled()
      
          target.remove()
        })
      
        it('should exit fullscreen in toggle mode', async () => {
          const user = userEvent.setup()
          const target = createTarget('toggle')
          const exitFullscreen = vi.fn().mockResolvedValue(undefined)
          document.exitFullscreen = exitFullscreen as any
      
          render(
            <ProWorkbenchTableFullScreen
              title="标题"
              fullScreenId="toggle"
              mode="toggle"
            />
          )
      
          const button = screen.getByRole('button', { name: '全屏' })
          await user.click(button)
      
          expect(target.requestFullscreen).toHaveBeenCalledTimes(1)
          ;(document as any).fullscreenElement = target
          fireEvent(document, new Event('fullscreenchange'))
      
          await waitFor(() => expect(button).toHaveAttribute('data-state', 'active'))
      
          await user.click(button)
      
          expect(exitFullscreen).toHaveBeenCalledTimes(1)
      
          target.remove()
        })
      
        it('should notify fullscreen change listeners', async () => {
          const target = createTarget('notify')
          const handleChange = vi.fn()
      
          render(
            <ProWorkbenchTableFullScreen
              title="标题"
              fullScreenTarget={() => target}
              onFullScreenChange={handleChange}
            />
          )
      
          await waitFor(() => expect(handleChange).toHaveBeenCalledWith(false, null))
      
          handleChange.mockClear()
          ;(document as any).fullscreenElement = target
          fireEvent(document, new Event('fullscreenchange'))
      
          await waitFor(() => expect(handleChange).toHaveBeenCalledWith(true, target))
      
          target.remove()
        })
      
        it('should respect disabled state', async () => {
          const user = userEvent.setup()
          const target = createTarget('disabled')
      
          render(
            <ProWorkbenchTableFullScreen
              title="标题"
              fullScreenTarget={() => target}
              disabled
            />
          )
      
          const button = screen.getByRole('button', { name: '全屏' })
          expect(button).toBeDisabled()
      
          await user.click(button)
      
          expect(target.requestFullscreen).not.toHaveBeenCalled()
      
          target.remove()
        })
      })

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-table-full-screen/index.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-table-full-screen/index.tsx
    lang: tsx
    template: |
      'use client'
      
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { generateUtilityClasses } from '@/registry/default/lib/class-generator'
      import {
        Tooltip,
        TooltipContent,
        TooltipProvider,
        TooltipTrigger,
      } from '@/registry/default/ui/ui-tooltip'
      
      import {
        useFullscreenManager,
        type FullScreenHandlerContext,
        type FullScreenTarget,
        type ResolvedButtonProps,
      } from './controller'
      
      const componentClasses = generateUtilityClasses('workbench-table-full-screen', [
        'root',
        'heading',
        'title',
        'description',
        'actions',
        'button',
        'icon',
        'hotkey',
      ])
      
      export interface ProWorkbenchTableFullScreenProps
        extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
        /** 标题内容 */
        title?: React.ReactNode
        /** 标题下方的描述 */
        description?: React.ReactNode
        /** 自定义 tooltip 文案（进入全屏） */
        tooltip?: React.ReactNode
        /** 自定义 tooltip 文案（退出全屏） */
        exitTooltip?: React.ReactNode
        /** 按钮禁用状态 */
        disabled?: boolean
        /** 提示中的快捷键文案，例如 F 或 ⇧ + F */
        hotkeyHint?: string
        /** 自定义进入全屏图标 */
        icon?: React.ReactNode
        /** 自定义退出全屏图标 */
        exitIcon?: React.ReactNode
        /** 标题区域类名 */
        titleClassName?: string
        /** 描述区域类名 */
        descriptionClassName?: string
        /** 按钮区域容器类名 */
        actionsClassName?: string
        /** 按钮类名 */
        buttonClassName?: string
        /** 按钮的 aria-label */
        buttonAriaLabel?: string
        /** 兼容旧实现，通过 id 查找全屏元素 */
        fullScreenId?: string
        /** 更灵活的全屏目标，支持元素、ref、函数或选择器 */
        fullScreenTarget?: FullScreenTarget
        /** requestFullscreen 的原生选项 */
        requestFullscreenOptions?: FullscreenOptions
        /** 点击模式：enter = 总是进入；toggle = 进入/退出切换 */
        mode?: 'enter' | 'toggle'
        /** 自定义进入全屏行为 */
        onEnterFullScreen?: (
          context: FullScreenHandlerContext
        ) => void | Promise<void>
        /** 自定义退出全屏行为（仅在 mode=toggle 时触发） */
        onExitFullScreen?: (context: FullScreenHandlerContext) => void | Promise<void>
        /** 全屏状态变化回调 */
        onFullScreenChange?: (isFullScreen: boolean, target: Element | null) => void
        /** 错误处理回调 */
        onError?: (error: unknown) => void
        /** 传递给按钮的其它属性 */
        buttonProps?: ResolvedButtonProps
      }
      
      const EnterFullScreenIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg
          aria-hidden="true"
          fill="none"
          height={12}
          viewBox="0 0 14 12"
          width={14}
          {...props}
        >
          <path
            d="M9.8301 0H13.8301V4H12.4968V1.33333H9.8301V0ZM0.496765 0H4.49677V1.33333H1.8301V4H0.496765V0ZM12.4968 10.6667V8H13.8301V12H9.8301V10.6667H12.4968ZM1.8301 10.6667H4.49677V12H0.496765V8H1.8301V10.6667Z"
            fill="currentColor"
          />
        </svg>
      )
      
      const ExitFullScreenIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg
          aria-hidden="true"
          fill="none"
          height={12}
          viewBox="0 0 14 12"
          width={14}
          {...props}
        >
          <path
            d="M9.8301 1.33301V0H13.8301V4H12.4968V1.33301H9.8301ZM1.8301 1.33301H4.49677V4H0.496765V0H1.8301V1.33301ZM12.4968 10.6663H13.8301V11.9997H9.8301V7.99967H11.1634V10.6663H12.4968ZM1.8301 7.99967V10.6663H4.49677V11.9997H0.496765V7.99967H1.8301Z"
            fill="currentColor"
          />
        </svg>
      )
      
      const ProWorkbenchTableFullScreen = React.forwardRef<
        HTMLDivElement,
        ProWorkbenchTableFullScreenProps
      >((props, ref) => {
        const {
          title,
          description,
          tooltip,
          exitTooltip,
          disabled,
          hotkeyHint,
          icon,
          exitIcon,
          className,
          titleClassName,
          descriptionClassName,
          actionsClassName,
          buttonClassName,
          buttonAriaLabel,
          fullScreenId,
          fullScreenTarget,
          requestFullscreenOptions,
          mode = 'toggle',
          onEnterFullScreen,
          onExitFullScreen,
          onFullScreenChange,
          onError,
          buttonProps,
          ...rest
        } = props
      
        const { t } = useTranslation('imd')
      
        const { isFullscreen, handleClick, restButtonProps } = useFullscreenManager({
          buttonProps,
          disabled,
          fullScreenTarget,
          fullScreenId,
          requestFullscreenOptions,
          mode,
          onEnterFullScreen,
          onExitFullScreen,
          onFullScreenChange,
          onError,
        })
      
        const resolvedEnterTooltip = tooltip ?? t('Fullscreen')
        const resolvedExitTooltip = exitTooltip ?? t('Exit Fullscreen')
        const computedAriaLabel =
          buttonAriaLabel ??
          (isFullscreen
            ? typeof resolvedExitTooltip === 'string'
              ? resolvedExitTooltip
              : t('Exit Fullscreen')
            : typeof resolvedEnterTooltip === 'string'
              ? resolvedEnterTooltip
              : t('Fullscreen'))
      
        const renderIcon = isFullscreen
          ? (exitIcon ?? <ExitFullScreenIcon className="text-gray-12" />)
          : (icon ?? <EnterFullScreenIcon className="text-gray-12" />)
      
        return (
          <div
            ref={ref}
            className={cn(
              'flex w-full items-center justify-between gap-3',
              className
            )}
            data-ui-slot={componentClasses.root}
            {...rest}
          >
            <div
              className={cn('min-w-0 flex-1', componentClasses.heading)}
              data-ui-slot={componentClasses.heading}
            >
              {title ? (
                <div
                  className={cn(
                    'text-gray-13 truncate text-base font-semibold',
                    titleClassName
                  )}
                  data-ui-slot={componentClasses.title}
                >
                  {title}
                </div>
              ) : null}
              {description ? (
                <p
                  className={cn('text-gray-9 mt-1 text-sm', descriptionClassName)}
                  data-ui-slot={componentClasses.description}
                >
                  {description}
                </p>
              ) : null}
            </div>
      
            <div
              className={cn('flex shrink-0 items-center gap-2', actionsClassName)}
              data-ui-slot={componentClasses.actions}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label={computedAriaLabel}
                      className={cn(
                        'focus-visible:ring-ring hover:bg-gray-3 bg-gray-2 text-gray-12 inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                        isFullscreen && 'bg-gray-4 text-gray-13',
                        buttonClassName
                      )}
                      data-state={isFullscreen ? 'active' : 'inactive'}
                      data-ui-slot={componentClasses.button}
                      disabled={disabled}
                      type="button"
                      onClick={handleClick}
                      {...restButtonProps}
                    >
                      <span
                        className="sr-only"
                        data-ui-slot={`${componentClasses.button}-sr`}
                      >
                        {computedAriaLabel}
                      </span>
                      <span data-ui-slot={componentClasses.icon}>{renderIcon}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="flex items-center gap-2">
                      <span>
                        {isFullscreen ? resolvedExitTooltip : resolvedEnterTooltip}
                      </span>
                      {hotkeyHint ? (
                        <kbd
                          className={cn(
                            'border-border bg-gray-2 text-gray-11 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide',
                            componentClasses.hotkey
                          )}
                        >
                          {hotkeyHint}
                        </kbd>
                      ) : null}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )
      })
      
      ProWorkbenchTableFullScreen.displayName = 'ProWorkbenchTableFullScreen'
      
      export { ProWorkbenchTableFullScreen, type FullScreenHandlerContext }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-table-full-screen/meta.json
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-table-full-screen/meta.json
    lang: json
    template: |
      {
        "dependencies": [],
        "registryDependencies": [
          "class-generator",
          "i18n",
          "ui-tooltip",
          "ui-fullscreen-dialog"
        ],
        "tags": [
          "workbench",
          "table",
          "fullscreen",
          "header",
          "toggle",
          "快捷键",
          "全屏"
        ]
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/assets.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/assets.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      
      import { COLORS, workbenchTabsClasses } from './constants'
      
      const BadgeIcon = () => (
        <svg
          aria-hidden="true"
          className={cn('shrink-0', workbenchTabsClasses.badge)}
          data-ui-slot={workbenchTabsClasses.badge}
          fill="none"
          height="10"
          viewBox="0 0 10 10"
          width="10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.59961 0.5C6.86385 0.5 8.69998 2.33542 8.7002 4.59961C8.7002 6.86398 6.86398 8.7002 4.59961 8.7002C2.33542 8.69998 0.5 6.86385 0.5 4.59961C0.500211 2.33555 2.33555 0.500211 4.59961 0.5Z"
            stroke="var(--workbench-tabs-badge-stroke,var(--color-card))"
          />
          <circle
            cx="4.6"
            cy="4.6"
            fill="var(--workbench-tabs-badge-fill,var(--color-red-primary))"
            r="3.6"
          />
        </svg>
      )
      
      const SelectedRightArrow = () => (
        <svg
          aria-hidden="true"
          className="h-full w-6 shrink-0"
          fill="none"
          height="60"
          viewBox="0 0 28 60"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0L1.85841 0C3.19582 0 4.44475 0.668405 5.18661 1.7812L22.5199 27.7812C23.4157 29.1248 23.4157 30.8752 22.5199 32.2188L5.18661 58.2188C4.44475 59.3316 3.19582 60 1.85841 60H0V0Z"
            fill={COLORS.selectedBackground}
          />
        </svg>
      )
      
      const UnselectedRightArrow = () => (
        <svg
          aria-hidden="true"
          className="h-full w-6 shrink-0"
          fill="none"
          height="60"
          viewBox="0 0 28 60"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0L1.85841 0C3.19582 0 4.44475 0.668405 5.18661 1.7812L22.5199 27.7812C23.4157 29.1248 23.4157 30.8752 22.5199 32.2188L5.18661 58.2188C4.44475 59.3316 3.19582 60 1.85841 60H0V0Z"
            fill={COLORS.unselectedBackground}
          />
        </svg>
      )
      
      const SelectedLeftSupplement = () => (
        <svg
          aria-hidden="true"
          className="h-full w-6 shrink-0"
          fill="none"
          height="60"
          viewBox="0 0 20 60"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24 60H4.0905C0.824007 60 -1.12036 56.43 0.698777 53.7725L15.4471 32.2275C16.3693 30.88 16.3693 29.12 15.4471 27.7725L0.698777 6.22754C-1.12036 3.57004 0.824007 0 4.0905 0H24V60Z"
            fill={COLORS.selectedBackground}
          />
        </svg>
      )
      
      const UnselectedLeftSupplement = () => (
        <svg
          aria-hidden="true"
          className="h-full w-6 shrink-0"
          fill="none"
          height="60"
          viewBox="0 0 20 60"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24 60H4.0905C0.824007 60 -1.12036 56.43 0.698777 53.7725L15.4471 32.2275C16.3693 30.88 16.3693 29.12 15.4471 27.7725L0.698777 6.22754C-1.12036 3.57004 0.824007 0 4.0905 0H24V60Z"
            fill={COLORS.unselectedBackground}
          />
        </svg>
      )
      
      interface BackgroundIds {
        maskId: string
        filterAId: string
        filterBId: string
      }
      
      const SelectedBackground = ({
        maskId,
        filterAId,
        filterBId,
      }: BackgroundIds) => (
        <svg
          aria-hidden="true"
          className="h-full w-full"
          fill="none"
          height="48"
          preserveAspectRatio="none"
          viewBox="0 0 428 48"
          width="428"
          xmlns="http://www.w3.org/2000/svg"
        >
          <mask
            height="48"
            id={maskId}
            maskUnits="userSpaceOnUse"
            style={{ maskType: 'alpha' }}
            width="428"
            x="0"
            y="0"
          >
            <path d="M0 0H428V48H0V0Z" fill={COLORS.unselectedBackground} />
          </mask>
          <g mask={`url(#${maskId})`}>
            <g filter={`url(#${filterAId})`} opacity="0.5">
              <ellipse
                cx="282.5"
                cy="-94.125"
                fill="var(--workbench-tabs-selected-glow,var(--color-purple-3))"
                rx="94.5"
                ry="118.125"
              />
            </g>
            <g filter={`url(#${filterBId})`}>
              <ellipse
                cx="141.5"
                cy="128.375"
                fill="var(--workbench-tabs-selected-glow,var(--color-purple-3))"
                rx="62.5"
                ry="78.125"
              />
            </g>
          </g>
          <defs>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="436.25"
              id={filterAId}
              width="389"
              x="88"
              y="-312.25"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="50" />
            </filter>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="396.25"
              id={filterBId}
              width="365"
              x="-41"
              y="-69.75"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="60" />
            </filter>
          </defs>
        </svg>
      )
      
      const UnselectedBackground = ({
        maskId,
        filterAId,
        filterBId,
      }: BackgroundIds) => (
        <svg
          aria-hidden="true"
          className="h-full w-full"
          fill="none"
          height="48"
          preserveAspectRatio="none"
          viewBox="0 0 428 48"
          width="428"
          xmlns="http://www.w3.org/2000/svg"
        >
          <mask
            height="48"
            id={maskId}
            maskUnits="userSpaceOnUse"
            style={{ maskType: 'alpha' }}
            width="428"
            x="0"
            y="0"
          >
            <path d="M0 0H428V48H0V0Z" fill={COLORS.unselectedBackground} />
          </mask>
          <g mask={`url(#${maskId})`}>
            <g filter={`url(#${filterAId})`} opacity="0.5">
              <ellipse
                cx="282.5"
                cy="-94.125"
                fill="var(--workbench-tabs-unselected-glow,var(--color-primary-3))"
                rx="94.5"
                ry="118.125"
              />
            </g>
            <g filter={`url(#${filterBId})`}>
              <ellipse
                cx="141.5"
                cy="128.375"
                fill="var(--workbench-tabs-unselected-glow,var(--color-primary-3))"
                rx="62.5"
                ry="78.125"
              />
            </g>
          </g>
          <defs>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="436.25"
              id={filterAId}
              width="389"
              x="88"
              y="-312.25"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="50" />
            </filter>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="396.25"
              id={filterBId}
              width="365"
              x="-41"
              y="-69.75"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="60" />
            </filter>
          </defs>
        </svg>
      )
      
      export {
        BadgeIcon,
        SelectedBackground,
        SelectedLeftSupplement,
        SelectedRightArrow,
        UnselectedBackground,
        UnselectedLeftSupplement,
        UnselectedRightArrow,
      }
      export type { BackgroundIds }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/constants.ts
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/constants.ts
    lang: ts
    template: |
      import { generateUtilityClasses } from '@/registry/default/lib/class-generator'
      
      const workbenchTabsClasses = generateUtilityClasses('workbench-tabs', [
        'root',
        'tab',
        'content',
        'mask',
        'icon',
        'label',
        'badge',
        'arrow-left',
        'arrow-right',
      ])
      
      const COLORS = {
        selectedBackground: 'var(--color-imileBlue-6)',
        unselectedBackground: 'var(--color-imileBlue-1)',
      } as const
      
      const VARIANT_CONFIG = {
        start: {
          showLeftArrow: false,
          showRightArrow: true,
          contentClassName: 'rounded-l-[6px]',
          rootClassName: '',
        },
        middle: {
          showLeftArrow: true,
          showRightArrow: true,
          contentClassName: 'rounded-none',
          rootClassName: 'scale-x-[1.05]',
        },
        end: {
          showLeftArrow: true,
          showRightArrow: false,
          contentClassName: 'rounded-r-[6px]',
          rootClassName: '',
        },
      } as const
      
      const TAB_OFFSET_PX = 10
      
      type VariantKey = keyof typeof VARIANT_CONFIG
      
      export { COLORS, TAB_OFFSET_PX, VARIANT_CONFIG, workbenchTabsClasses }
      export type { VariantKey }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/index.PROMPT.md
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/index.PROMPT.md
    lang: md
    template: |
      说明
      
      - 在工作台场景中展示三段式标签，兼顾图标、徽章和选中背景的业务态
      
      变体
      
      ```tsx
      import { ProWorkbenchTabs } from '@/components/ui/workbench-tabs'
      
      ;<ProWorkbenchTabs
        className="w-full"
        value="overview"
        options={[
          {
            value: 'overview',
            label: '基础信息',
            variant: 'start',
            icon: <span className="text-lg">📦</span>,
          },
          {
            value: 'route',
            label: '运输过程',
            variant: 'middle',
            icon: <span className="text-lg">🚚</span>,
          },
          {
            value: 'exception',
            label: '异常记录',
            variant: 'end',
            icon: <span className="text-lg">⚠️</span>,
            isShowBadge: true,
          },
        ]}
      />
      ```
      
      注意
      
      - 使用 `variant="start" | "middle" | "end"` 控制圆角与箭头，确保三个配置项首尾吻合
      - `options` 中的 `content` 可覆盖默认结构，自定义 KPI 卡片或业务摘要
      - `icon` 支持 ReactNode 或字符串 URL，字符串会自动渲染为 `<img>`
      - 通过 `value` 与 `onValueChange` 保持受控状态，可在 `onClick` 中 `preventDefault` 拦截切换

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/index.test.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/index.test.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      import { cleanup, render, screen } from '@testing-library/react'
      import userEvent from '@testing-library/user-event'
      import { afterEach, describe, expect, it, vi } from 'vitest'
      
      import { ProWorkbenchTabs } from './index'
      
      describe('ProWorkbenchTabs', () => {
        afterEach(() => {
          cleanup()
        })
      
        const baseOptions = [
          {
            value: 'left',
            label: '左侧',
            variant: 'start' as const,
          },
          {
            value: 'center',
            label: '中间',
            variant: 'middle' as const,
          },
          {
            value: 'right',
            label: '右侧',
            variant: 'end' as const,
          },
        ]
      
        it('exposes stable display name', () => {
          expect(ProWorkbenchTabs.displayName).toBe('ProWorkbenchTabs')
        })
      
        it('renders tabs with label and optional icon', () => {
          render(
            <ProWorkbenchTabs
              value="left"
              onValueChange={() => {}}
              options={[
                {
                  ...baseOptions[0],
                  icon: 'https://example.com/icon.png',
                },
                baseOptions[2],
              ]}
            />
          )
      
          expect(screen.getByRole('button', { name: '左侧' })).toHaveAttribute(
            'aria-pressed',
            'true'
          )
          expect(screen.getByRole('button', { name: '右侧' })).toHaveAttribute(
            'aria-pressed',
            'false'
          )
      
          const icon = document.querySelector(
            '[data-ui-slot="workbench-tabs-icon"]'
          ) as HTMLImageElement | null
          expect(icon).not.toBeNull()
          expect(icon?.src).toContain('https://example.com/icon.png')
        })
      
        it('allows option content override', () => {
          render(
            <ProWorkbenchTabs
              value="center"
              options={[
                {
                  ...baseOptions[1],
                  content: <span data-testid="custom-content">自定义内容</span>,
                },
              ]}
            />
          )
      
          expect(screen.getByTestId('custom-content')).toBeInTheDocument()
          expect(screen.queryByText('中间')).not.toBeInTheDocument()
        })
      
        it('supports badge indicator and onValueChange handler', async () => {
          const handleValueChange = vi.fn()
          const user = userEvent.setup()
      
          render(
            <ProWorkbenchTabs
              value="left"
              onValueChange={handleValueChange}
              options={[
                baseOptions[0],
                {
                  ...baseOptions[2],
                  isShowBadge: true,
                },
              ]}
            />
          )
      
          expect(screen.getByRole('button', { name: '右侧' })).toHaveAttribute(
            'data-selected',
            'false'
          )
          expect(
            document.querySelector('[data-ui-slot="workbench-tabs-badge"]')
          ).not.toBeNull()
      
          await user.click(screen.getByRole('button', { name: '右侧' }))
          expect(handleValueChange).toHaveBeenCalledTimes(1)
          expect(handleValueChange).toHaveBeenCalledWith(
            'right',
            expect.objectContaining({ label: '右侧' }),
            expect.any(MouseEvent)
          )
        })
      
        it('renders arrow supplements according to variant', () => {
          render(
            <ProWorkbenchTabs
              value="left"
              options={baseOptions}
              onValueChange={() => {}}
            />
          )
      
          const tabs = screen.getAllByRole('button')
          const [startTab, middleTab, endTab] = tabs
      
          expect(
            startTab.querySelector('[data-ui-slot="workbench-tabs-arrow-left"]')
          ).toBeNull()
          expect(
            startTab.querySelector('[data-ui-slot="workbench-tabs-arrow-right"]')
          ).not.toBeNull()
      
          expect(
            middleTab.querySelector('[data-ui-slot="workbench-tabs-arrow-left"]')
          ).not.toBeNull()
          expect(
            middleTab.querySelector('[data-ui-slot="workbench-tabs-arrow-right"]')
          ).not.toBeNull()
      
          expect(
            endTab.querySelector('[data-ui-slot="workbench-tabs-arrow-left"]')
          ).not.toBeNull()
          expect(
            endTab.querySelector('[data-ui-slot="workbench-tabs-arrow-right"]')
          ).toBeNull()
        })
      
        it('respects renderContent override callback', () => {
          render(
            <ProWorkbenchTabs
              value="left"
              options={baseOptions}
              renderContent={(option, state) => (
                <span data-testid={`render-${option.value}`}>
                  {state.selected ? '选中' : '未选中'}
                </span>
              )}
            />
          )
      
          expect(screen.getByTestId('render-left')).toHaveTextContent('选中')
          expect(screen.getByTestId('render-right')).toHaveTextContent('未选中')
        })
      })

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/index.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/index.tsx
    lang: tsx
    template: |
      'use client'
      
      import * as React from 'react'
      
      import { ProWorkbenchTab, type ProWorkbenchTabProps } from './tab'
      import {
        ProWorkbenchTabsRoot,
        type ProWorkbenchTabsRootProps,
      } from './tabs-root'
      
      type ProWorkbenchTabsValue = React.Key
      
      type InternalTabProps = Omit<
        ProWorkbenchTabProps,
        'children' | 'isSelected' | 'type' | 'value' | 'content'
      >
      
      interface ProWorkbenchTabsOption extends InternalTabProps {
        value: ProWorkbenchTabsValue
        type?: React.ButtonHTMLAttributes<HTMLButtonElement>['type']
        content?: React.ReactNode
      }
      
      interface ProWorkbenchTabsProps extends ProWorkbenchTabsRootProps {
        options: ProWorkbenchTabsOption[]
        value: ProWorkbenchTabsValue
        onValueChange?: (
          value: ProWorkbenchTabsValue,
          option: ProWorkbenchTabsOption,
          event: React.MouseEvent<HTMLButtonElement>
        ) => void
        renderContent?: (
          option: ProWorkbenchTabsOption,
          state: { selected: boolean }
        ) => React.ReactNode
      }
      
      const ProWorkbenchTabs = React.forwardRef<
        HTMLDivElement,
        ProWorkbenchTabsProps
      >(
        (
          { options, value, onValueChange, renderContent, className, ...rest },
          ref
        ) => {
          return (
            <ProWorkbenchTabsRoot ref={ref} className={className} {...rest}>
              {options.map((option) => {
                const {
                  value: optionValue,
                  content,
                  type,
                  onClick,
                  ...tabProps
                } = option
                const isSelected = optionValue === value
      
                const resolvedContent =
                  content ?? renderContent?.(option, { selected: isSelected })
      
                const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
                  onClick?.(event)
                  if (!event.defaultPrevented) {
                    onValueChange?.(optionValue, option, event)
                  }
                }
      
                return (
                  <ProWorkbenchTab
                    key={String(optionValue)}
                    {...tabProps}
                    isSelected={isSelected}
                    type={type}
                    onClick={handleClick}
                  >
                    {resolvedContent}
                  </ProWorkbenchTab>
                )
              })}
            </ProWorkbenchTabsRoot>
          )
        }
      )
      
      ProWorkbenchTabs.displayName = 'ProWorkbenchTabs'
      
      export { ProWorkbenchTabs }
      export type {
        ProWorkbenchTabsOption,
        ProWorkbenchTabsProps,
        ProWorkbenchTabsValue,
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/mask-background.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/mask-background.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      
      import { SelectedBackground, UnselectedBackground } from './assets'
      import { workbenchTabsClasses } from './constants'
      
      const MaskBackground = ({ isSelected }: { isSelected: boolean }) => {
        const uniqueId = React.useId().replace(/[:]/g, '')
        const maskId = `${uniqueId}-mask`
        const filterAId = `${uniqueId}-filter-a`
        const filterBId = `${uniqueId}-filter-b`
      
        return (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 z-0 overflow-hidden',
              workbenchTabsClasses.mask
            )}
          >
            {isSelected ? (
              <SelectedBackground
                filterAId={filterAId}
                filterBId={filterBId}
                maskId={maskId}
              />
            ) : (
              <UnselectedBackground
                filterAId={filterAId}
                filterBId={filterBId}
                maskId={maskId}
              />
            )}
          </span>
        )
      }
      
      export { MaskBackground }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/meta.json
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/meta.json
    lang: json
    template: |
      {
        "dependencies": [],
        "registryDependencies": ["class-generator", "ui-ellipsis"],
        "tags": [
          "tabs",
          "workbench",
          "navigation",
          "badge",
          "workbench-tabs",
          "状态切换",
          "工作台",
          "多状态"
        ]
      }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/render-icon.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/render-icon.tsx
    lang: tsx
    template: |
      /* eslint-disable @next/next/no-img-element */
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      
      import { workbenchTabsClasses } from './constants'
      
      const renderIcon = (icon?: React.ReactNode | string) => {
        if (!icon) return null
      
        if (typeof icon === 'string') {
          return (
            <img
              alt=""
              aria-hidden="true"
              className={cn(
                'size-6 min-h-6 min-w-6 object-contain',
                workbenchTabsClasses.icon
              )}
              data-ui-slot={workbenchTabsClasses.icon}
              src={icon}
            />
          )
        }
      
        return (
          <span
            className={workbenchTabsClasses.icon}
            data-ui-slot={workbenchTabsClasses.icon}
          >
            {icon}
          </span>
        )
      }
      
      export { renderIcon }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/tab.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/tab.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      import {
        Ellipsis,
        EllipsisContent,
        EllipsisTooltip,
      } from '@/registry/default/ui/ui-ellipsis'
      
      import {
        BadgeIcon,
        SelectedLeftSupplement,
        SelectedRightArrow,
        UnselectedLeftSupplement,
        UnselectedRightArrow,
      } from './assets'
      import {
        COLORS,
        VARIANT_CONFIG,
        workbenchTabsClasses,
        type VariantKey,
      } from './constants'
      import { MaskBackground } from './mask-background'
      import { renderIcon } from './render-icon'
      
      interface ProWorkbenchTabProps
        extends Omit<
          React.ButtonHTMLAttributes<HTMLButtonElement>,
          'children' | 'type'
        > {
        variant: VariantKey
        icon?: React.ReactNode | string
        children?: React.ReactNode
        onClick?: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
        isSelected?: boolean
        label: string
        isShowBadge?: boolean
        type?: React.ButtonHTMLAttributes<HTMLButtonElement>['type']
      }
      
      const ProWorkbenchTab = React.forwardRef<
        HTMLButtonElement,
        ProWorkbenchTabProps
      >((props, ref) => {
        const {
          variant,
          icon,
          children,
          onClick,
          isSelected = false,
          label,
          isShowBadge = false,
          className,
          style,
          type,
          ...rest
        } = props
      
        const config = VARIANT_CONFIG[variant]
        const buttonType = type ?? 'button'
      
        const content = children ?? (
          <div className={cn('relative flex items-center gap-2')}>
            {renderIcon(icon)}
            <Ellipsis className="min-w-0 flex-1" content={label} rows={2}>
              <EllipsisTooltip>
                <EllipsisContent
                  className={cn(
                    'min-w-0 flex-1 text-left font-semibold leading-tight',
                    workbenchTabsClasses.label,
                    isSelected ? 'text-white' : 'text-gray-13'
                  )}
                />
              </EllipsisTooltip>
            </Ellipsis>
            {isShowBadge ? (
              <span className="pointer-events-none absolute -right-2 -top-1 flex">
                <BadgeIcon />
              </span>
            ) : null}
          </div>
        )
      
        return (
          <button
            {...rest}
            ref={ref}
            aria-pressed={isSelected}
            className={cn(
              'min-h-12 group relative flex h-12 flex-1 items-stretch justify-between overflow-hidden',
              'focus-visible:ring-offset-background focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              config.rootClassName,
              className,
              workbenchTabsClasses.tab
            )}
            data-selected={isSelected ? 'true' : 'false'}
            data-ui-slot={workbenchTabsClasses.tab}
            style={style}
            type={buttonType}
            onClick={onClick}
          >
            {config.showLeftArrow ? (
              <span
                aria-hidden="true"
                className={cn(
                  'relative left-[1px] z-10',
                  workbenchTabsClasses['arrow-left']
                )}
                data-ui-slot={workbenchTabsClasses['arrow-left']}
              >
                {isSelected ? (
                  <SelectedLeftSupplement />
                ) : (
                  <UnselectedLeftSupplement />
                )}
              </span>
            ) : null}
      
            <span
              className={cn(
                'relative z-10 flex h-full w-full items-center bg-transparent px-6 text-base font-medium',
                config.contentClassName,
                variant !== 'start' && 'pl-2',
                isSelected
                  ? 'bg-[var(--workbench-tabs-selected-bg)] text-white'
                  : 'text-gray-13 bg-[var(--workbench-tabs-unselected-bg)]',
                workbenchTabsClasses.content
              )}
              data-ui-slot={workbenchTabsClasses.content}
              style={
                {
                  '--workbench-tabs-selected-bg': COLORS.selectedBackground,
                  '--workbench-tabs-unselected-bg': COLORS.unselectedBackground,
                } as React.CSSProperties
              }
            >
              {content}
            </span>
      
            {config.showRightArrow ? (
              <span
                // eslint-disable-next-line tailwindcss/enforces-negative-arbitrary-values
                aria-hidden="true"
                className={cn(
                  'relative -left-[1px] z-10',
                  workbenchTabsClasses['arrow-right']
                )}
                data-ui-slot={workbenchTabsClasses['arrow-right']}
              >
                {isSelected ? <SelectedRightArrow /> : <UnselectedRightArrow />}
              </span>
            ) : null}
      
            <MaskBackground isSelected={isSelected} />
          </button>
        )
      })
      
      ProWorkbenchTab.displayName = 'ProWorkbenchTabs.Tab'
      
      export { ProWorkbenchTab }
      export type { ProWorkbenchTabProps }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/tabs-root.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs/tabs-root.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      
      import { workbenchTabsClasses } from './constants'
      
      interface ProWorkbenchTabsRootProps
        extends React.HTMLAttributes<HTMLDivElement> {}
      
      const ProWorkbenchTabsRoot = React.forwardRef<
        HTMLDivElement,
        ProWorkbenchTabsRootProps
      >(({ className, children, ...rest }, ref) => {
        return (
          <div
            ref={ref}
            className={cn(
              'relative flex w-full gap-0',
              workbenchTabsClasses.root,
              className
            )}
            data-ui-slot={workbenchTabsClasses.root}
            {...rest}
          >
            {children}
          </div>
        )
      })
      
      ProWorkbenchTabsRoot.displayName = 'ProWorkbenchTabs'
      
      export { ProWorkbenchTabsRoot }
      export type { ProWorkbenchTabsRootProps }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator/__tests__/index.test.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator/__tests__/index.test.tsx
    lang: tsx
    template: |
      import * as React from 'react'
      import { cleanup, render, screen } from '@testing-library/react'
      import userEvent from '@testing-library/user-event'
      import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
      import { axe } from 'vitest-axe'
      
      import {
        WorkbenchTabsIndicator,
        type WorkbenchTabsIndicatorProps,
      } from '../index'
      
      vi.mock('@/registry/default/ui/pro-tooltip', () => ({
        Tooltip: ({
          title,
          children,
        }: {
          title?: React.ReactNode
          children: React.ReactNode
        }) => (
          <div data-testid="mock-tooltip" data-title={title}>
            {children}
          </div>
        ),
      }))
      
      describe('WorkbenchTabsIndicator', () => {
        let user: ReturnType<typeof userEvent.setup>
      
        beforeEach(() => {
          user = userEvent.setup()
        })
      
        afterEach(() => {
          cleanup()
          vi.clearAllMocks()
        })
      
        const setup = (props?: Partial<WorkbenchTabsIndicatorProps>) => {
          const base: WorkbenchTabsIndicatorProps = {
            label: '仓内作业',
            value: '162 单',
          }
      
          return render(
            <WorkbenchTabsIndicator {...base} {...props}>
              <WorkbenchTabsIndicator.Item label="拣货延迟" value={6} warning />
              <WorkbenchTabsIndicator.Item label="分拣异常" value={0} />
            </WorkbenchTabsIndicator>
          )
        }
      
        describe('rendering', () => {
          it('should render label, value and items', () => {
            setup()
      
            expect(screen.getByText('仓内作业')).toBeInTheDocument()
            expect(screen.getByText('162 单')).toBeInTheDocument()
            expect(screen.getByText('拣货延迟')).toBeInTheDocument()
            expect(screen.getByText('6')).toBeInTheDocument()
          })
      
          it('should apply active state data attribute', () => {
            setup({ active: true })
            const root = screen.getByRole('button')
            expect(root).toHaveAttribute('data-active', '')
            expect(root).toHaveAttribute('aria-pressed', 'true')
          })
      
          it('should render icon when icon is a string source', () => {
            const iconSrc =
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><circle cx='6' cy='6' r='6' fill='%232546FF'/></svg>"
            setup({ icon: iconSrc, iconAlt: '指示图标' })
            const icon = screen.getByRole('img', { name: '指示图标' })
            expect(icon).toBeInTheDocument()
            expect(icon).toHaveAttribute('src', iconSrc)
          })
      
          it('should merge custom className hooks', () => {
            setup({
              className: 'custom-root',
              labelClassName: 'custom-label',
              valueClassName: 'custom-value',
              itemsClassName: 'custom-items',
            })
      
            expect(screen.getByRole('button')).toHaveClass('custom-root')
            expect(screen.getByText('仓内作业')).toHaveClass('custom-label')
            expect(screen.getByText('162 单')).toHaveClass('custom-value')
      
            const itemsContainer = screen
              .getByRole('button')
              .querySelector('[data-ui-slot="workbench-tabs-indicator-body"]')
            expect(itemsContainer).toHaveClass('custom-items')
          })
      
          it('should render tooltip title through mock component', () => {
            setup({ tooltip: '库内效率说明' })
            expect(screen.getByTestId('mock-tooltip')).toHaveAttribute(
              'data-title',
              '库内效率说明'
            )
          })
        })
      
        describe('item behaviour', () => {
          it('should not trigger parent click when item clicked', async () => {
            const handleRoot = vi.fn()
            const handleItem = vi.fn()
      
            render(
              <WorkbenchTabsIndicator
                label="库内作业"
                value="162 单"
                onClick={handleRoot}
              >
                <WorkbenchTabsIndicator.Item
                  label="警告项"
                  value={3}
                  warning
                  onClick={handleItem}
                />
              </WorkbenchTabsIndicator>
            )
      
            await user.click(screen.getByText('警告项'))
            expect(handleItem).toHaveBeenCalledTimes(1)
            expect(handleRoot).not.toHaveBeenCalled()
          })
      
          it('should apply warning style when warning or warnning props present', () => {
            render(
              <WorkbenchTabsIndicator label="调度" value="--">
                <WorkbenchTabsIndicator.Item label="API" value={3} warnning />
              </WorkbenchTabsIndicator>
            )
            const value = screen.getByText('3')
            expect(value.className).toContain('text-red-6')
          })
      
          it('should merge custom item class names', () => {
            render(
              <WorkbenchTabsIndicator label="活跃留存" value="92%">
                <WorkbenchTabsIndicator.Item
                  label="周活跃"
                  value="87%"
                  className="item-root"
                  labelClassName="item-label"
                  valueClassName="item-value"
                />
              </WorkbenchTabsIndicator>
            )
      
            const item = screen.getByText('周活跃').closest('[role="button"]')
            expect(item).toHaveClass('item-root')
            expect(screen.getByText('周活跃')).toHaveClass('item-label')
            expect(screen.getByText('87%')).toHaveClass('item-value')
          })
        })
      
        describe('accessibility', () => {
          it('should have no major accessibility violations', async () => {
            const { container } = setup({
              tooltip: '监控库内拣货、分拣和装车效率',
            })
            const results = await axe(container)
            expect(results).toHaveNoViolations()
          })
      
          it('should support asChild pattern', () => {
            const CustomLink = React.forwardRef<
              HTMLAnchorElement,
              React.ComponentProps<'a'>
            >(({ children, ...rest }, ref) => (
              <a ref={ref} {...rest}>
                {children}
              </a>
            ))
      
            CustomLink.displayName = 'CustomLink'
      
            render(
              <WorkbenchTabsIndicator
                asChild
                active
                label="渠道总览"
                value="468"
                icon={<span>🔗</span>}
              >
                <CustomLink href="#channels" className="link-root" />
              </WorkbenchTabsIndicator>
            )
      
            const anchor = screen.getByRole('link')
            expect(anchor).toHaveClass('link-root')
            expect(anchor).toHaveAttribute(
              'data-ui-slot',
              'workbench-tabs-indicator-root'
            )
            expect(anchor).toHaveAttribute('data-active', '')
          })
        })
      })

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator/index.PROMPT.md
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator/index.PROMPT.md
    lang: md
    template: |
      说明
      
      - 三段式指标卡，结合主指标与子项标签，适合工作台 Tab 面板内的 KPI 切换场景
      
      变体
      
      ```tsx
      import { WorkbenchTabsIndicator } from '@/components/ui/workbench-tabs-indicator'
      
      ;<WorkbenchTabsIndicator
        active
        icon="/icons/warehouse.svg"
        label="库内作业"
        tooltip="监控库内拣货、分拣和装车效率"
        value="162 单"
      >
        <WorkbenchTabsIndicator.Item label="拣货延迟" value={6} warning />
        <WorkbenchTabsIndicator.Item label="分拣异常" value="2" />
        <WorkbenchTabsIndicator.Item label="装车完成率" value="94%" />
      </WorkbenchTabsIndicator>
      ```
      
      注意
      
      - 主指标默认渲染 `<button>`，需要与外层路由组件组合时可使用 `asChild`
      - 子项为 `WorkbenchTabsIndicator.Item`，`warning` 或旧拼写 `warnning` 为真且值大于 0 时会渲染警示色
      - 子项 `onClick` 会阻止冒泡，可独立处理明细跳转，必要时配合键盘事件保证可访问性

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator/index.tsx
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator/index.tsx
    lang: tsx
    template: |
      /* eslint-disable @next/next/no-img-element */
      'use client'
      
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      import { generateUtilityClasses } from '@/registry/default/lib/class-generator'
      import { Tooltip } from '@/registry/default/ui/pro-tooltip'
      
      const indicatorClasses = generateUtilityClasses('workbench-tabs-indicator', [
        'root',
        'header',
        'icon',
        'label',
        'tooltip',
        'divider',
        'value',
        'body',
        'item',
        'item-label',
        'item-tooltip',
        'item-divider',
        'item-value',
      ])
      
      const WenhaoIcon = () => (
        <svg
          aria-hidden="true"
          fill="none"
          height="14"
          viewBox="0 0 1024 1024"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M512 0a512 512 0 100 1024A512 512 0 00512 0zm0 809.13a45.74 45.74 0 110-91.4 45.74 45.74 0 010 91.4zm71.85-250.88a55.21 55.21 0 00-35.24 51.2v25.94a9.13 9.13 0 01-9.22 9.22h-54.7a9.13 9.13 0 01-9.21-9.22v-24.57a127.74 127.74 0 0182.26-120.92c38.91-14.93 64-47.53 64-83.03 0-50.35-49.24-91.48-109.65-91.48s-109.74 41.05-109.74 91.48v8.7a9.13 9.13 0 01-9.13 9.13h-54.87a9.13 9.13 0 01-9.13-9.13v-8.7c0-44.89 19.62-86.87 55.3-118.1A192.68 192.68 0 01512 242.35c48.04 0 93.27 16.55 127.57 46.5 35.59 31.24 55.3 73.22 55.3 118.1 0 66.05-43.52 125.44-110.93 151.39z"
            fill="currentColor"
          />
        </svg>
      )
      
      const Divider = ({ className }: { className?: string }) => (
        <span
          aria-hidden="true"
          className={cn(
            'bg-gray-4 mx-1 h-3 w-px rounded-full',
            indicatorClasses.divider,
            className
          )}
        />
      )
      
      type IconSource = React.ReactNode | string
      
      type BaseButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>
      
      export interface WorkbenchTabsIndicatorProps
        extends Omit<BaseButtonProps, 'children' | 'value'> {
        /** 是否处于激活态 */
        active?: boolean
        /** 主标题 */
        label: React.ReactNode
        /** 主标题额外类名 */
        labelClassName?: string
        /** 主数值 */
        value?: React.ReactNode
        /** 主数值额外类名 */
        valueClassName?: string
        /** 标题右侧的提示内容 */
        tooltip?: React.ReactNode
        /** 标题左侧的图标，支持图片地址或 ReactNode */
        icon?: IconSource
        /** 自定义子内容（通常为 WorkbenchTabsIndicator.Item） */
        children?: React.ReactNode
        /** 子项容器额外类名 */
        itemsClassName?: string
        /** 使用自定义元素渲染根节点 */
        asChild?: boolean
        /** 图标的无障碍描述，仅在 icon 为字符串时使用 */
        iconAlt?: string
      }
      
      interface WorkbenchTabsIndicatorItemProps
        extends React.HTMLAttributes<HTMLDivElement> {
        /** 子项标题 */
        label: React.ReactNode
        /** 子项标题额外类名 */
        labelClassName?: string
        /** 子项数值，默认为 0 */
        value?: React.ReactNode
        /** 子项数值额外类名 */
        valueClassName?: string
        /** 子项提示 */
        tooltip?: React.ReactNode
        /** 是否为选中态 */
        active?: boolean
        /** 是否为告警态 */
        warning?: boolean
        /** 告警态兼容旧拼写 */
        warnning?: boolean
        /** 交互回调 */
        onClick?: () => void
      }
      
      const renderIcon = (icon: IconSource, alt?: string) => {
        if (!icon) return null
        if (typeof icon === 'string') {
          return (
            <img
              alt={alt ?? ''}
              className={cn('h-[18px] w-[18px] shrink-0', indicatorClasses.icon)}
              src={icon}
            />
          )
        }
        return (
          <span
            className={cn(
              'flex h-[18px] w-[18px] shrink-0 items-center justify-center',
              indicatorClasses.icon
            )}
          >
            {icon}
          </span>
        )
      }
      
      const renderTooltip = (tooltip: React.ReactNode, className?: string) => {
        if (!tooltip) return null
        return (
          <Tooltip placement="top-center" title={tooltip}>
            <span
              aria-label={
                typeof tooltip === 'string' ? (tooltip as string) : undefined
              }
              className={cn(
                'text-gray-5 flex h-[14px] w-[14px] shrink-0 items-center justify-center text-[12px]',
                indicatorClasses.tooltip,
                className
              )}
              role={typeof tooltip === 'string' ? 'img' : undefined}
            >
              <WenhaoIcon />
            </span>
          </Tooltip>
        )
      }
      
      const WorkbenchTabsIndicatorRoot = React.forwardRef<
        HTMLButtonElement,
        WorkbenchTabsIndicatorProps
      >((props, ref) => {
        const {
          active = false,
          label,
          value,
          tooltip,
          icon,
          children,
          className,
          labelClassName,
          valueClassName,
          itemsClassName,
          asChild = false,
          disabled,
          iconAlt,
          style,
          onClick,
          ...rest
        } = props
      
        const childElement =
          asChild && React.isValidElement(children)
            ? (children as React.ReactElement)
            : null
      
        const items = childElement ? childElement.props.children : children
      
        const labelTooltip =
          typeof label === 'string' || typeof label === 'number'
            ? String(label)
            : undefined
      
        const labelContent = (
          <span
            className={cn(
              'text-gray-13 line-clamp-2 min-w-0 text-[14px] font-medium',
              indicatorClasses.label,
              labelClassName
            )}
          >
            {label}
          </span>
        )
      
        const renderedLabel =
          labelTooltip !== undefined ? (
            <Tooltip placement="top-center" title={labelTooltip}>
              {labelContent}
            </Tooltip>
          ) : (
            labelContent
          )
      
        const baseClass =
          'group flex-1 flex grow min-h-[82px] flex-col rounded-md border bg-white p-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--workbench-tabs-indicator-outline,var(--color-primary-3))]'
      
        const rootClassName = cn(
          baseClass,
          disabled
            ? 'pointer-events-none cursor-not-allowed opacity-60'
            : 'cursor-pointer',
          active ? 'border-blue-600 bg-blue-50' : 'border-gray-3',
          !disabled && !active && 'hover:border-blue-600',
          indicatorClasses.root,
          className
        )
      
        const headerContent = (
          <div
            className={cn('flex flex-1 items-center gap-2', indicatorClasses.header)}
          >
            {renderIcon(icon, iconAlt)}
            {renderedLabel}
            {renderTooltip(tooltip)}
            <Divider />
            <span
              className={cn(
                'text-gray-13 text-[16px] font-semibold',
                indicatorClasses.value,
                valueClassName
              )}
            >
              {value}
            </span>
          </div>
        )
      
        const body = items ? (
          <div
            className={cn(
              'mt-2 flex flex-col gap-1',
              indicatorClasses.body,
              itemsClassName
            )}
            data-ui-slot={indicatorClasses.body}
          >
            {items}
          </div>
        ) : null
      
        const content = (
          <>
            {headerContent}
            {body}
          </>
        )
      
        if (childElement) {
          const mergedOnClick = (
            event: React.MouseEvent<HTMLElement, MouseEvent>
          ) => {
            childElement.props.onClick?.(event)
            if (event.defaultPrevented) return
            onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>)
          }
      
          const mergedStyle = {
            ...childElement.props.style,
            ...style,
          }
      
          return React.cloneElement(childElement as React.ReactElement, {
            ...rest,
            ref: ref as React.Ref<any>,
            className: cn(rootClassName, childElement.props.className),
            style: mergedStyle,
            'data-active': active ? '' : undefined,
            'data-ui-slot': indicatorClasses.root,
            'aria-pressed': active || undefined,
            'aria-disabled': disabled ? true : undefined,
            onClick: mergedOnClick,
            children: content,
          })
        }
      
        return (
          <button
            ref={ref}
            aria-pressed={active || undefined}
            className={rootClassName}
            data-active={active ? '' : undefined}
            data-ui-slot={indicatorClasses.root}
            disabled={disabled}
            style={style}
            type="button"
            onClick={onClick}
            {...rest}
          >
            {content}
          </button>
        )
      })
      
      WorkbenchTabsIndicatorRoot.displayName = 'WorkbenchTabsIndicator'
      
      const WorkbenchTabsIndicatorItem = ({
        label,
        value,
        tooltip,
        active = false,
        warning,
        warnning,
        className,
        labelClassName,
        valueClassName,
        onClick,
        ...rest
      }: WorkbenchTabsIndicatorItemProps) => {
        const isWarning = warning ?? warnning ?? false
      
        const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
          event.stopPropagation()
          onClick?.()
        }
      
        return (
          <div
            className={cn(
              'flex h-full w-full items-center gap-1 rounded px-1 text-xs transition-colors',
              active ? 'bg-blue-200' : 'hover:bg-gray-1 bg-transparent',
              indicatorClasses.item,
              className
            )}
            data-active={active ? '' : undefined}
            data-ui-slot={indicatorClasses.item}
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }}
            {...rest}
          >
            <span
              className={cn(
                'text-gray-10 text-[12px] font-normal',
                indicatorClasses['item-label'],
                labelClassName
              )}
            >
              {label}
            </span>
            {renderTooltip(tooltip, indicatorClasses['item-tooltip'])}
            <span
              aria-hidden="true"
              className={cn(
                'bg-gray-4 h-3 w-px rounded-full',
                indicatorClasses['item-divider']
              )}
            />
            <span
              className={cn(
                'text-[14px] font-semibold',
                isWarning && value && Number(value) > 0
                  ? 'text-red-6'
                  : 'text-gray-10',
                indicatorClasses['item-value'],
                valueClassName
              )}
            >
              {value ?? '0'}
            </span>
          </div>
        )
      }
      
      WorkbenchTabsIndicatorItem.displayName = 'WorkbenchTabsIndicator.Item'
      
      type WorkbenchTabsIndicatorComponent = React.ForwardRefExoticComponent<
        WorkbenchTabsIndicatorProps & React.RefAttributes<HTMLButtonElement>
      > & {
        Item: typeof WorkbenchTabsIndicatorItem
      }
      
      const WorkbenchTabsIndicator =
        WorkbenchTabsIndicatorRoot as WorkbenchTabsIndicatorComponent
      
      WorkbenchTabsIndicator.Item = WorkbenchTabsIndicatorItem
      
      export { WorkbenchTabsIndicator }
      export { WenhaoIcon }
      export type { WorkbenchTabsIndicatorItemProps }

  - path: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator/meta.json
    out: apps/www2/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator/meta.json
    lang: json
    template: |
      {
        "registryDependencies": ["class-generator", "pro-tooltip"],
        "tags": [
          "workbench",
          "tabs-indicator",
          "summary-card",
          "kpi-switcher",
          "工作台",
          "指标卡",
          "多级指标"
        ]
      }

  - path: apps/www2/registry/default/templates/workbench/components/drawer/drawer-store.ts
    out: apps/www2/registry/default/templates/workbench/components/drawer/drawer-store.ts
    lang: ts
    template: |
      'use client'
      
      import { create } from 'zustand'
      import { immer } from 'zustand/middleware/immer'
      
      import type { DrawerFilterCategory } from '../../types'
      
      interface DrawerFilters {
        keyword: string
        category: DrawerFilterCategory
      }
      
      interface DrawerState {
        open: boolean
        filters: DrawerFilters
        selectedIds: string[]
        setOpen: (open: boolean) => void
        setFilters: (filters: Partial<DrawerFilters>) => void
        resetFilters: () => void
        toggleSelection: (id: string) => void
        selectAll: (ids: string[]) => void
        clearSelection: () => void
        setSelectedIds: (ids: string[]) => void
      }
      
      const initialFilters: DrawerFilters = {
        keyword: '',
        category: 'all',
      }
      
      const useDrawerStore = create<DrawerState>()(
        immer((set) => ({
          open: false,
          filters: initialFilters,
          selectedIds: [],
          setOpen: (open) => {
            set((state) => {
              state.open = open
              if (!open) {
                state.selectedIds = []
              }
            })
          },
          setFilters: (filters) => {
            set((state) => {
              state.filters = { ...state.filters, ...filters }
            })
          },
          resetFilters: () => {
            set((state) => {
              state.filters = { ...initialFilters }
            })
          },
          toggleSelection: (id) => {
            set((state) => {
              const exists = state.selectedIds.includes(id)
              state.selectedIds = exists
                ? state.selectedIds.filter((currentId) => currentId !== id)
                : [...state.selectedIds, id]
            })
          },
          selectAll: (ids) => {
            set((state) => {
              state.selectedIds = Array.from(new Set(ids))
            })
          },
          clearSelection: () => {
            set((state) => {
              state.selectedIds = []
            })
          },
          setSelectedIds: (ids) => {
            set((state) => {
              state.selectedIds = ids
            })
          },
        }))
      )
      
      export type { DrawerFilters, DrawerState }
      export type { DrawerFilterCategory } from '../../types'
      export { useDrawerStore }

  - path: apps/www2/registry/default/templates/workbench/components/drawer/drawer.tsx
    out: apps/www2/registry/default/templates/workbench/components/drawer/drawer.tsx
    lang: tsx
    template: |
      'use client'
      
      import { useMemo, type ReactNode } from 'react'
      import { ExpandIcon } from 'lucide-react'
      
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { useAntdTable } from '@/registry/default/lib/query'
      import { Button } from '@/registry/default/ui/pro-button'
      import { ProPageFilter } from '@/registry/default/ui/pro-page-filter'
      import { Poptextarea } from '@/registry/default/ui/pro-poptextarea'
      import { Table as ImileTable } from '@/registry/default/ui/pro-table'
      import { TextField } from '@/registry/default/ui/pro-textField'
      import {
        Alert,
        AlertClose,
        AlertContent,
        AlertDescription,
        AlertTypeIcon,
      } from '@/registry/default/ui/ui-alert'
      import {
        Drawer,
        DrawerBody,
        DrawerContent,
        DrawerFooter,
        DrawerHeader,
        DrawerTitle,
        DrawerTrigger,
      } from '@/registry/default/ui/ui-drawer'
      import { Tabs, TabsList, TabsTrigger } from '@/registry/default/ui/ui-tabs'
      
      import { queryKeys } from '../../index.query-keys'
      import { getDrawerTableRows } from '../../service'
      import type { DrawerFilterCategory, DrawerTableItem } from '../../types'
      import { ExportButton } from '../export-button'
      import { useDrawerStore } from './drawer-store'
      import { useDrawerColumns } from './use-drawer-columns'
      
      function CountWithSeparator(props: React.ComponentProps<'span'>) {
        return (
          <>
            <span className="ml-2 text-[12px] leading-none opacity-30">|</span>
            <span className="ml-2 font-semibold" {...props} />
          </>
        )
      }
      
      const categoryOptions: Array<{ label: string; value: DrawerFilterCategory }> = [
        { label: '全部类型', value: 'all' },
        { label: '网点类', value: 'site' },
        { label: '线路类', value: 'route' },
      ]
      
      interface WorkbenchDrawerProps {
        trigger?: ReactNode
      }
      
      export function WorkbenchDrawer({ trigger }: WorkbenchDrawerProps) {
        const {
          open,
          setOpen,
          filters,
          setFilters,
          resetFilters,
          selectedIds,
          setSelectedIds,
        } = useDrawerStore((state) => state)
      
        const columns = useDrawerColumns()
      
        const drawerQueryParams = useMemo(
          () => ({
            keyword: filters.keyword.trim(),
            category: filters.category,
          }),
          [filters.category, filters.keyword]
        )
      
        const { tableProps, query } = useAntdTable({
          queryKey: queryKeys.drawerTable(drawerQueryParams),
          showCount: 8,
          queryFn: ({ pagination }) =>
            getDrawerTableRows({
              ...pagination,
              ...drawerQueryParams,
            }),
        })
      
        const { t } = useTranslation()
      
        return (
          <Drawer open={open} dismissible onOpenChange={setOpen}>
            {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
            <DrawerContent size="large">
              <DrawerHeader>
                <DrawerTitle className="text-base font-semibold text-slate-900">
                  {t('已卸未到待反馈上级网点')}
                </DrawerTitle>
              </DrawerHeader>
              <DrawerBody className="space-y-6">
                <Alert status="doubt" variant="local">
                  <AlertTypeIcon />
                  <AlertContent>
                    <AlertDescription>
                      {t(
                        '对于网点已卸车但是实际未入站扫描的包裹会记录；请12小时内反馈上级网点；请根据实际情况选择对应的未到原因'
                      )}
                    </AlertDescription>
                  </AlertContent>
                  <AlertClose />
                </Alert>
                <ProPageFilter defaultRowCount={1} variant="outlined">
                  <ProPageFilter.Item>
                    <TextField
                      label={t('运单号')}
                      placeholder="请输入用户名"
                      suffix={
                        <Poptextarea
                          trigger={
                            <Button
                              className="mr-[-8px]"
                              color="secondary"
                              icon={<ExpandIcon />}
                              size="small"
                            />
                          }
                        />
                      }
                      value={filters.keyword}
                      allowClear
                      onChange={(event) =>
                        setFilters({ keyword: event.target.value })
                      }
                    />
                  </ProPageFilter.Item>
                  <ProPageFilter.Actions>
                    <Button
                      color="reset"
                      variant="outlined"
                      onClick={() => {
                        resetFilters()
                        setTimeout(() => {
                          query.refetch()
                        }, 100)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          resetFilters()
                          setTimeout(() => {
                            query.refetch()
                          }, 100)
                        }
                      }}
                    >
                      {t('重置')}
                    </Button>
                    <Button
                      color="search"
                      onClick={() => {
                        query.refetch()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          query.refetch()
                        }
                      }}
                    >
                      {t('查询')}
                    </Button>
                  </ProPageFilter.Actions>
                </ProPageFilter>
                <div className="flex justify-between">
                  <Tabs
                    value={filters.category}
                    variant="button"
                    onChange={(value) =>
                      setFilters({ category: value as DrawerFilterCategory })
                    }
                  >
                    <TabsList>
                      {categoryOptions.map((option) => (
                        <TabsTrigger key={option.value} value={option.value}>
                          {option.label} <CountWithSeparator>1</CountWithSeparator>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <ExportButton
                    exportAllParams={{
                      bizType: '23030618',
                      system: 'tms',
                      jobName: '一键导出订单列表',
                      queryContent: {
                        ...drawerQueryParams,
                      },
                    }}
                    exportSelectedParams={{
                      bizType: '23030618',
                      system: 'tms',
                      jobName: '一键导出订单列表',
                      queryContent: {
                        ...drawerQueryParams,
                      },
                    }}
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="max-h-[420px] overflow-auto">
                      <ImileTable
                        {...tableProps}
                        borderType="dividing"
                        columns={columns}
                        emptyPlaceholder={
                          <div className="py-10 text-center text-sm text-slate-500">
                            {t('暂无符合条件的数据')}
                          </div>
                        }
                        pagination={{
                          ...tableProps.pagination,
                          showSizeChanger: true,
                          showTotal: true,
                        }}
                        rowKey="id"
                        rowSelection={{
                          type: 'checkbox',
                          selectedRowKeys: selectedIds,
                          onChange: (keys) => {
                            setSelectedIds((keys ?? []) as unknown as string[])
                          },
                          onSelectAll: (_selected, keys = []) => {
                            setSelectedIds((keys ?? []) as unknown as string[])
                          },
                        }}
                        fixedHeader
                        rowHoverable
                        stickyHeader
                      />
                    </div>
                  </div>
                </div>
              </DrawerBody>
              <DrawerFooter className="flex flex-col items-stretch gap-2 border-t border-slate-200 bg-slate-50 py-4"></DrawerFooter>
            </DrawerContent>
          </Drawer>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/drawer/index.ts
    out: apps/www2/registry/default/templates/workbench/components/drawer/index.ts
    lang: ts
    template: |
      export { WorkbenchDrawer } from './drawer'

  - path: apps/www2/registry/default/templates/workbench/components/drawer/use-drawer-columns.tsx
    out: apps/www2/registry/default/templates/workbench/components/drawer/use-drawer-columns.tsx
    lang: tsx
    template: |
      'use client'
      
      import { useMemo } from 'react'
      import { type ColumnsType } from '@imile/table'
      
      import type { DrawerTableItem } from '../../types'
      
      export function useDrawerColumns(): ColumnsType<DrawerTableItem> {
        return useMemo(
          () => [
            {
              title: '运单号',
              dataIndex: 'orderId',
              key: 'orderId',
              width: 160,
              render: (value) => (
                <span className="font-medium text-slate-900">{String(value)}</span>
              ),
            },
            {
              title: '责任网点 / 线路',
              dataIndex: 'site',
              key: 'site',
              width: 200,
            },
            {
              title: '负责人',
              dataIndex: 'manager',
              key: 'manager',
              width: 120,
            },
            {
              title: '联系电话',
              dataIndex: 'phone',
              key: 'phone',
              width: 140,
            },
            {
              title: '异常情况',
              dataIndex: 'exception',
              key: 'exception',
              width: 240,
            },
            {
              title: '最新更新时间',
              dataIndex: 'updatedAt',
              key: 'updatedAt',
              width: 180,
            },
          ],
          []
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/export-button.tsx
    out: apps/www2/registry/default/templates/workbench/components/export-button.tsx
    lang: tsx
    template: |
      import { useFireExport } from '@imile/components'
      import { ChevronDown } from 'lucide-react'
      
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { DropdownMenu, MenuItem } from '@/registry/default/ui/pro-dropdown-menu'
      import { Button } from '@/registry/default/ui/ui-button'
      
      import { UploadIcon } from './left/table/icon'
      
      interface ExportParams {
        bizType: string
        jobName: string
        queryContent: Record<string, any>
        titles?: string
        jobType?: number
        totalCount?: number
        businessUniqueCode?: string
        system:
          | 'order'
          | 'ipep'
          | 'wms'
          | 'tms'
          | 'oms'
          | 'erp'
          | 'prism'
          | 'payment'
          | 'waukeen'
          | 'goods'
          | 'b2b'
          | 'portal'
          | 'ksaWaukeen'
          | 'hermes'
          | 'logCenter'
          | 'athena'
          | 'print'
          | 'saas-tms'
          | 'hera'
          | 'saas-waukeen'
          | 'saas-prism'
          | 'work-order'
          | 'dms'
          | 'clearance'
          | 'hrms'
          | 'crm'
          | 'cornerstone'
          | 'tmslhd'
          | 'pms'
          | 'ilts'
          | 'fms'
          | 'csc'
          | 'message'
          | 'mms'
          | 'collectionpoint'
          | 'fastseller'
          | 'sla'
          | 'fetch'
        extraData?: Record<string, any>
      }
      
      export function ExportButton({
        exportSelectedParams,
        exportAllParams,
      }: {
        exportSelectedParams: ExportParams
        exportAllParams: ExportParams
      }) {
        const { t } = useTranslation()
        const fireExport = useFireExport()
        const exportMenus: MenuItem[] = [
          {
            key: 'export-selected',
            label: t('导出选中'),
            onClick: () => {
              fireExport({
                exportParams: exportSelectedParams,
              })
            },
          },
          {
            key: 'export-all',
            label: t('导出全部'),
            onClick: () => {
              fireExport({
                exportParams: exportAllParams,
              })
            },
          },
        ]
        return (
          <DropdownMenu menus={exportMenus} trigger="click">
            <Button
              className="items-center gap-2"
              color="secondary"
              size="medium"
              type="button"
              variant="contained"
            >
              <Button.Icon>
                <UploadIcon className="size-4" />
              </Button.Icon>
              {t('导出')}
              <Button.Icon>
                <ChevronDown className="size-4" />
              </Button.Icon>
            </Button>
          </DropdownMenu>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/hooks/use-tabs-data.ts
    out: apps/www2/registry/default/templates/workbench/components/left/hooks/use-tabs-data.ts
    lang: ts
    template: |
      import { useQuery } from '@/registry/default/lib/query'
      
      import { queryKeys } from '../../../index.query-keys'
      import { getTabsData } from '../../../service'
      
      export const useTabsData = () => {
        return useQuery({
          queryKey: queryKeys.tabsData({}),
          queryFn: () => {
            return getTabsData()
          },
        })
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/hooks/use-workbench-right-status.ts
    out: apps/www2/registry/default/templates/workbench/components/left/hooks/use-workbench-right-status.ts
    lang: ts
    template: |
      import React from 'react'
      
      import { useWorkbenchStore } from '../../../stores/index.store'
      
      export const useWorkbenchRightStatus = () => {
        const contentStatus = useWorkbenchStore(
          (state) => state.rightPanel.contentStatus
        )
        const setContentStatus = useWorkbenchStore(
          (state) => state.rightPanel.setContentStatus
        )
      
        return React.useMemo(
          () => ({
            contentStatus,
            setContentStatus,
          }),
          [contentStatus, setContentStatus]
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/index.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/index.tsx
    lang: tsx
    template: |
      'use client'
      
      import { LeftTabs } from './left-tabs'
      import { TabIndicator } from './tab-indicator'
      import { Table } from './table'
      import { WorkbenchHelpAlert } from './workbench-help-alert'
      
      /**
       *
       * @returns 左侧内容区域
       */
      export function Left() {
        return (
          <div className="h-full w-full overflow-y-auto bg-white p-3">
            <LeftTabs className="mb-3" />
            <TabIndicator className="mb-3" />
            <WorkbenchHelpAlert className="mb-3" />
            <Table />
          </div>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/left-tabs.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/left-tabs.tsx
    lang: tsx
    template: |
      'use client'
      
      import {
        ProWorkbenchTabs,
        type ProWorkbenchTabsOption,
        type ProWorkbenchTabsProps,
      } from '@/registry/default/templates/workbench/blocks/ui/workbench-tabs'
      
      import { useTabDefinitions } from '../../hooks/use-tab-definitions'
      import { useWorkbenchStore } from '../../stores/index.store'
      import type { TabId, TabIndicatorResponse, TabValue } from '../../types'
      import { hasAnyValueGreaterThanZero } from '../../utils'
      import { useTabOneIndicatorQuery } from './tab-indicator/hooks/use-tab-one-indicator-query'
      import { useTabThreeIndicatorQuery } from './tab-indicator/hooks/use-tab-three-indicator-query'
      import { useTabTwoIndicatorQuery } from './tab-indicator/hooks/use-tab-two-indicator-query'
      
      type LeftTabsProps = Omit<
        ProWorkbenchTabsProps,
        'options' | 'value' | 'onValueChange'
      >
      
      const hasBadge = (snapshot?: TabIndicatorResponse) => {
        if (!snapshot) {
          return false
        }
      
        const values: Record<string, number> = {}
      
        Object.entries(snapshot).forEach(([indicatorKey, indicatorValue]) => {
          values[indicatorKey] = indicatorValue.value
      
          Object.entries(indicatorValue.children).forEach(
            ([childKey, childValue]) => {
              values[`${indicatorKey}.${childKey}`] = childValue
            }
          )
        })
      
        return hasAnyValueGreaterThanZero(values)
      }
      
      export const LeftTabs = (props: LeftTabsProps) => {
        const activeTab = useWorkbenchStore((state) => state.tabs.activeTab)
        const setActiveTab = useWorkbenchStore((state) => state.tabs.setActiveTab)
        const { data: tabOneIndicator } = useTabOneIndicatorQuery()
        const { data: tabTwoIndicator } = useTabTwoIndicatorQuery()
        const { data: tabThreeIndicator } = useTabThreeIndicatorQuery()
      
        const indicatorSnapshots: Partial<Record<TabId, TabIndicatorResponse>> = {
          tabOne: tabOneIndicator,
          tabTwo: tabTwoIndicator,
          tabThree: tabThreeIndicator,
        }
      
        const TAB_DEFINITIONS = useTabDefinitions()
      
        const options: ProWorkbenchTabsOption[] = TAB_DEFINITIONS.map((tab) => ({
          value: tab.value,
          label: tab.label,
          variant: tab.variant,
          icon: <span className="text-lg leading-none">{tab.icon}</span>,
          isShowBadge: hasBadge(indicatorSnapshots[tab.id]),
        }))
      
        return (
          <ProWorkbenchTabs
            {...props}
            options={options}
            value={activeTab}
            onValueChange={(next) => setActiveTab(next as TabValue)}
          />
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/hooks/use-tab-one-indicator-query.ts
    out: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/hooks/use-tab-one-indicator-query.ts
    lang: ts
    template: |
      import { useQuery } from '@/registry/default/lib/query'
      
      import { queryKeys } from '../../../../index.query-keys'
      import { getTabOneIndicatorValues } from '../../../../service'
      import type { TabIndicatorResponse } from '../../../../types'
      
      export const useTabOneIndicatorQuery = () =>
        useQuery<TabIndicatorResponse>({
          queryKey: queryKeys.tabOneIndicator({}),
          queryFn: () => getTabOneIndicatorValues(),
        })

  - path: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/hooks/use-tab-three-indicator-query.ts
    out: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/hooks/use-tab-three-indicator-query.ts
    lang: ts
    template: |
      import { useQuery } from '@/registry/default/lib/query'
      
      import { queryKeys } from '../../../../index.query-keys'
      import { getTabThreeIndicatorValues } from '../../../../service'
      import type { TabIndicatorResponse } from '../../../../types'
      
      export const useTabThreeIndicatorQuery = () =>
        useQuery<TabIndicatorResponse>({
          queryKey: queryKeys.tabThreeIndicator({}),
          queryFn: () => getTabThreeIndicatorValues(),
        })

  - path: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/hooks/use-tab-two-indicator-query.ts
    out: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/hooks/use-tab-two-indicator-query.ts
    lang: ts
    template: |
      import { useQuery } from '@/registry/default/lib/query'
      
      import { queryKeys } from '../../../../index.query-keys'
      import { getTabTwoIndicatorValues } from '../../../../service'
      import type { TabIndicatorResponse } from '../../../../types'
      
      export const useTabTwoIndicatorQuery = () =>
        useQuery<TabIndicatorResponse>({
          queryKey: queryKeys.tabTwoIndicator({}),
          queryFn: () => getTabTwoIndicatorValues(),
        })

  - path: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/index.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/index.tsx
    lang: tsx
    template: |
      'use client'
      
      import type { ComponentType, HTMLAttributes } from 'react'
      
      import { useWorkbenchStore } from '../../../stores/index.store'
      import type { TabValue } from '../../../types'
      import { TabsOneIndicator } from './tabs-one-indicator'
      import { TabsThreeIndicator } from './tabs-three-indicator'
      import { TabsTwoIndicator } from './tabs-two-indicator'
      
      type IndicatorComponent = ComponentType<HTMLAttributes<HTMLDivElement>>
      
      const INDICATOR_COMPONENTS: Record<TabValue, IndicatorComponent> = {
        '1': TabsOneIndicator,
        '2': TabsTwoIndicator,
        '3': TabsThreeIndicator,
      }
      
      export function TabIndicator(props: HTMLAttributes<HTMLDivElement>) {
        const activeTab = useWorkbenchStore((state) => state.tabs.activeTab)
        const Component = INDICATOR_COMPONENTS[activeTab]
      
        if (!Component) {
          return null
        }
      
        return <Component {...props} />
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/tabs-one-indicator.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/tabs-one-indicator.tsx
    lang: tsx
    template: |
      'use client'
      
      import { cn } from '@/lib/utils'
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { WorkbenchTabsIndicator } from '@/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator'
      
      import { useWorkbenchStore } from '../../../stores/index.store'
      import { useTabOneIndicatorQuery } from './hooks/use-tab-one-indicator-query'
      
      type Indicator = {
        key: string
        label: string
        icon: React.ReactNode
        value: number | string
        formatValue?: (value: number) => string
        tooltip: string
        children: Array<{
          key: string
          label: string
          value: number | string
          tooltip?: string
          warning?: boolean
          formatValue?: (value: number) => string
        }>
      }
      
      const formatWithThousands = (value: number) => value.toLocaleString('en-US')
      
      const appendPercent = (value: number, fractionDigits = 0) => {
        const formatted = value.toFixed(fractionDigits)
        return `${formatted}%`
      }
      
      export const TabsOneIndicator = (
        props: React.HTMLAttributes<HTMLDivElement>
      ) => {
        const tabState = useWorkbenchStore((state) => state.indicatorOne)
        const { data } = useTabOneIndicatorQuery()
        const { t } = useTranslation()
        const params = tabState.params
        const setParams = tabState.setParams
      
        const indicators: Indicator[] = [
          {
            key: 'warehouse',
            label: t('库内作业'),
            icon: <span className="text-lg leading-none">🏭</span>,
            value:
              typeof data?.warehouse?.value === 'number'
                ? formatWithThousands(data.warehouse.value)
                : '162',
            tooltip: t('监控库内拣货、分拣和装车效率'),
            children: [
              {
                key: 'picking-delay',
                label: t('拣货延迟'),
                value:
                  typeof data?.warehouse?.children?.['picking-delay'] === 'number'
                    ? formatWithThousands(data.warehouse.children['picking-delay'])
                    : '6',
                warning: true,
                tooltip: t('超过 SLA 的拣货任务数'),
              },
              {
                key: 'sorting',
                label: t('分拣异常'),
                value:
                  typeof data?.warehouse?.children?.sorting === 'number'
                    ? formatWithThousands(data.warehouse.children.sorting)
                    : '2',
                tooltip: t('破损或错分的包裹数'),
              },
              {
                key: 'loading',
                label: t('装车完成率'),
                value:
                  typeof data?.warehouse?.children?.loading === 'number'
                    ? appendPercent(data.warehouse.children.loading)
                    : '94%',
              },
            ],
          },
          {
            key: 'delivery',
            label: t(
              '末端派送超长文本超长文本超长文本超长文本超长文本超长文本超长文本'
            ),
            icon: <span className="text-lg leading-none">🚚</span>,
            value:
              typeof data?.delivery?.value === 'number'
                ? formatWithThousands(data.delivery.value)
                : '2,846',
            tooltip: t('派件、签收与催派等末端指标'),
            children: [
              {
                key: 'courier',
                label: t('待派件'),
                value:
                  typeof data?.delivery?.children?.courier === 'number'
                    ? formatWithThousands(data.delivery.children.courier)
                    : '312',
              },
              {
                key: 'overdue',
                label: t('即将超时'),
                value:
                  typeof data?.delivery?.children?.overdue === 'number'
                    ? formatWithThousands(data.delivery.children.overdue)
                    : '24',
                warning: true,
                tooltip: t('距离 SLA 30 分钟的订单数'),
              },
              {
                key: 'signed',
                label: t('已签收'),
                value:
                  typeof data?.delivery?.children?.signed === 'number'
                    ? appendPercent(data.delivery.children.signed)
                    : '92%',
              },
            ],
          },
          {
            key: 'exception',
            label: t('异常处理'),
            icon: <span className="text-lg leading-none">⚠️</span>,
            value:
              typeof data?.exception?.value === 'number'
                ? formatWithThousands(data.exception.value)
                : '48',
            tooltip: t('破损、拒收、错分等异常单据'),
            children: [
              {
                key: 'damage',
                label: t('破损件'),
                value:
                  typeof data?.exception?.children?.damage === 'number'
                    ? formatWithThousands(data.exception.children.damage)
                    : '9',
                warning: true,
              },
              {
                key: 'reject',
                label: t('拒收件'),
                value:
                  typeof data?.exception?.children?.reject === 'number'
                    ? formatWithThousands(data.exception.children.reject)
                    : '12',
              },
              {
                key: 'reattach',
                label: t('改派处理'),
                value:
                  typeof data?.exception?.children?.reattach === 'number'
                    ? formatWithThousands(data.exception.children.reattach)
                    : '5',
              },
            ],
          },
        ]
      
        return (
          <div {...props} className={cn('flex w-full gap-2', props.className)}>
            {indicators.map((indicator) => (
              <WorkbenchTabsIndicator
                key={indicator.key}
                active={indicator.key === params.paramOne}
                icon={indicator.icon}
                label={indicator.label}
                tooltip={indicator.tooltip}
                value={indicator.value}
                onClick={() => {
                  if (indicator.key === params.paramOne) {
                    setParams({ paramOne: '', paramTwo: '' })
                  } else {
                    setParams({ paramOne: indicator.key })
                  }
                }}
              >
                {indicator.children.map((child) => (
                  <WorkbenchTabsIndicator.Item
                    key={child.key}
                    active={
                      indicator.key === params.paramOne &&
                      params.paramTwo === child.key
                    }
                    label={child.label}
                    tooltip={child.tooltip}
                    value={child.value}
                    warning={child.warning}
                    onClick={() => {
                      if (
                        indicator.key === params.paramOne &&
                        params.paramTwo === child.key
                      ) {
                        setParams({ paramTwo: '' })
                      } else {
                        setParams({ paramOne: indicator.key, paramTwo: child.key })
                      }
                    }}
                  />
                ))}
              </WorkbenchTabsIndicator>
            ))}
          </div>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/tabs-three-indicator.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/tabs-three-indicator.tsx
    lang: tsx
    template: |
      'use client'
      
      import { cn } from '@/lib/utils'
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { WorkbenchTabsIndicator } from '@/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator'
      
      import { useWorkbenchStore } from '../../../stores/index.store'
      import { useTabThreeIndicatorQuery } from './hooks/use-tab-three-indicator-query'
      
      type Indicator = {
        key: string
        label: string
        icon: React.ReactNode
        value: number | string
        formatValue?: (value: number) => string
        tooltip: string
        children: Array<{
          key: string
          label: string
          value: number | string
          tooltip?: string
          warning?: boolean
          formatValue?: (value: number) => string
        }>
      }
      
      const formatWithThousands = (value: number) => value.toLocaleString('en-US')
      
      const appendPercent = (value: number, fractionDigits = 0) => {
        const formatted = value.toFixed(fractionDigits)
        return `${formatted}%`
      }
      
      const formatSeconds = (value: number) => `${Math.round(value)}s`
      
      const formatSigned = (value: number, suffix = '', fractionDigits = 0) => {
        const formatted = value.toLocaleString('en-US', {
          maximumFractionDigits: fractionDigits,
        })
        const sign = value >= 0 ? '+' : ''
        return `${sign}${formatted}${suffix}`
      }
      
      export const TabsThreeIndicator = (
        props: React.HTMLAttributes<HTMLDivElement>
      ) => {
        const tabState = useWorkbenchStore((state) => state.indicatorThree)
        const { data } = useTabThreeIndicatorQuery()
        const { t } = useTranslation()
        const params = tabState.params
        const setParams = tabState.setParams
      
        const indicators: Indicator[] = [
          {
            key: 'customer-service',
            label: t('客服体验'),
            icon: <span className="text-lg leading-none">🎧</span>,
            value:
              typeof data?.['customer-service']?.value === 'number'
                ? appendPercent(data['customer-service'].value, 1)
                : '98.2%',
            tooltip: t('客服对话满意度与响应效率'),
            children: [
              {
                key: 'first-response',
                label: t('首响时长'),
                value:
                  typeof data?.['customer-service']?.children?.['first-response'] ===
                  'number'
                    ? formatSeconds(
                        data['customer-service'].children['first-response']
                      )
                    : '36s',
              },
              {
                key: 'resolution',
                label: t('一次解决率'),
                value:
                  typeof data?.['customer-service']?.children?.resolution === 'number'
                    ? appendPercent(data['customer-service'].children.resolution, 0)
                    : '91%',
              },
              {
                key: 'complaint',
                label: t('投诉量'),
                value:
                  typeof data?.['customer-service']?.children?.complaint === 'number'
                    ? formatWithThousands(data['customer-service'].children.complaint)
                    : '8',
                warning: true,
                tooltip: t('今日仍未关闭的投诉单'),
              },
            ],
          },
          {
            key: 'merchant',
            label: t('商家生态'),
            icon: <span className="text-lg leading-none">🏪</span>,
            value:
              typeof data?.merchant?.value === 'number'
                ? formatWithThousands(data.merchant.value)
                : '1,096',
            tooltip: t('入驻商家活跃与履约表现'),
            children: [
              {
                key: 'active-merchants',
                label: t('活跃商家'),
                value:
                  typeof data?.merchant?.children?.['active-merchants'] === 'number'
                    ? formatWithThousands(data.merchant.children['active-merchants'])
                    : '864',
              },
              {
                key: 'sla-breach',
                label: t('履约违约'),
                value:
                  typeof data?.merchant?.children?.['sla-breach'] === 'number'
                    ? formatWithThousands(data.merchant.children['sla-breach'])
                    : '22',
                warning: true,
                tooltip: t('未在 SLA 内完成发货的商家'),
              },
              {
                key: 'gmv',
                label: t('GMV 环比'),
                value:
                  typeof data?.merchant?.children?.gmv === 'number'
                    ? formatSigned(data.merchant.children.gmv, '%', 0)
                    : '+12%',
              },
            ],
          },
          {
            key: 'feedback',
            label: t('用户反馈'),
            icon: <span className="text-lg leading-none">💬</span>,
            value:
              typeof data?.feedback?.value === 'number'
                ? formatWithThousands(data.feedback.value)
                : '426',
            tooltip: t('问卷、应用内反馈与 NPS'),
            children: [
              {
                key: 'nps',
                label: t('NPS 得分'),
                value:
                  typeof data?.feedback?.children?.nps === 'number'
                    ? formatSigned(data.feedback.children.nps)
                    : '+47',
              },
              {
                key: 'survey',
                label: t('问卷回收'),
                value:
                  typeof data?.feedback?.children?.survey === 'number'
                    ? appendPercent(data.feedback.children.survey)
                    : '62%',
              },
              {
                key: 'feature-request',
                label: t('功能建议'),
                value:
                  typeof data?.feedback?.children?.['feature-request'] === 'number'
                    ? formatWithThousands(data.feedback.children['feature-request'])
                    : '19',
              },
            ],
          },
        ]
      
        return (
          <div {...props} className={cn('flex w-full gap-2', props.className)}>
            {indicators.map((indicator) => (
              <WorkbenchTabsIndicator
                key={indicator.key}
                active={indicator.key === params.paramOne}
                icon={indicator.icon}
                label={indicator.label}
                tooltip={indicator.tooltip}
                value={indicator.value}
                onClick={() => {
                  if (indicator.key === params.paramOne) {
                    setParams({ paramOne: '', paramTwo: '' })
                  } else {
                    setParams({ paramOne: indicator.key })
                  }
                }}
              >
                {indicator.children.map((child) => (
                  <WorkbenchTabsIndicator.Item
                    key={child.key}
                    active={
                      indicator.key === params.paramOne &&
                      params.paramTwo === child.key
                    }
                    label={child.label}
                    tooltip={child.tooltip}
                    value={child.value}
                    warning={child.warning}
                    onClick={() => {
                      if (
                        indicator.key === params.paramOne &&
                        params.paramTwo === child.key
                      ) {
                        setParams({ paramTwo: '' })
                      } else {
                        setParams({ paramOne: indicator.key, paramTwo: child.key })
                      }
                    }}
                  />
                ))}
              </WorkbenchTabsIndicator>
            ))}
          </div>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/tabs-two-indicator.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/tab-indicator/tabs-two-indicator.tsx
    lang: tsx
    template: |
      'use client'
      
      import { cn } from '@/lib/utils'
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { WorkbenchTabsIndicator } from '@/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator'
      
      import { useWorkbenchStore } from '../../../stores/index.store'
      import { useTabTwoIndicatorQuery } from './hooks/use-tab-two-indicator-query'
      
      type Indicator = {
        key: string
        label: string
        icon: React.ReactNode
        value: number | string
        formatValue?: (value: number) => string
        tooltip: string
        children: Array<{
          key: string
          label: string
          value: number | string
          tooltip?: string
          warning?: boolean
          formatValue?: (value: number) => string
        }>
      }
      
      const formatWithThousands = (value: number) => value.toLocaleString('en-US')
      
      const appendPercent = (value: number, fractionDigits = 0) => {
        const formatted = value.toFixed(fractionDigits)
        return `${formatted}%`
      }
      
      const formatCurrencyWithUnit = (value: number) => {
        const formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 })
        return `￥${formatted}K`
      }
      
      export const TabsTwoIndicator = (
        props: React.HTMLAttributes<HTMLDivElement>
      ) => {
        const tabState = useWorkbenchStore((state) => state.indicatorTwo)
        const { data } = useTabTwoIndicatorQuery()
        const { t } = useTranslation()
        const params = tabState.params
        const setParams = tabState.setParams
      
        const indicators: Indicator[] = [
          {
            key: 'linehaul',
            label: t('干线运输'),
            icon: <span className="text-lg leading-none">🛣️</span>,
            value: data?.linehaul?.value?.toString() ?? '1,284',
            tooltip: t('干线发车准点率与车辆监控'),
            children: [
              {
                key: 'departure',
                label: t('发车准点'),
                value: data?.linehaul?.children?.departure ?? '97%',
                formatValue: (value) => appendPercent(value),
              },
              {
                key: 'transit-delay',
                label: t('在途异常'),
                value: data?.linehaul?.children?.['transit-delay'] ?? '14',
                formatValue: formatWithThousands,
                warning: true,
                tooltip: t('超出计划在途时长的班车数'),
              },
              {
                key: 'capacity',
                label: t('运力利用率'),
                value: data?.linehaul?.children?.capacity ?? '81%',
                formatValue: (value) => appendPercent(value),
              },
            ],
          },
          {
            key: 'hub',
            label: t('中转枢纽'),
            icon: <span className="text-lg leading-none">🏗️</span>,
            value: data?.hub?.value?.toString() ?? '768',
            formatValue: formatWithThousands,
            tooltip: t('中转分拨入库、出库与异常识别'),
            children: [
              {
                key: 'inbound',
                label: t('待入库'),
                value: data?.hub?.children?.inbound ?? '126',
                formatValue: formatWithThousands,
              },
              {
                key: 'outbound-delay',
                label: t('出库延迟'),
                value: data?.hub?.children?.['outbound-delay'] ?? '18',
                formatValue: formatWithThousands,
                warning: true,
                tooltip: t('超过 SLA 的出库批次'),
              },
              {
                key: 'exceptions',
                label: t('异常件'),
                value: data?.hub?.children?.exceptions ?? '32',
                formatValue: formatWithThousands,
              },
            ],
          },
          {
            key: 'cost',
            label: t('成本监控'),
            icon: <span className="text-lg leading-none">💹</span>,
            value: data?.cost?.value?.toString() ?? '￥182K',
            formatValue: formatCurrencyWithUnit,
            tooltip: t('运输成本与分摊趋势分析'),
            children: [
              {
                key: 'fuel',
                label: t('油耗支出'),
                value: data?.cost?.children?.fuel ?? '￥62K',
                formatValue: formatCurrencyWithUnit,
              },
              {
                key: 'toll',
                label: t('路桥费用'),
                value: data?.cost?.children?.toll ?? '￥38K',
                formatValue: formatCurrencyWithUnit,
              },
              {
                key: 'abnormal-expense',
                label: t('异常补贴'),
                value: data?.cost?.children?.['abnormal-expense'] ?? '￥7.6K',
                formatValue: formatCurrencyWithUnit,
                warning: true,
                tooltip: t('临时补贴与异常理赔'),
              },
            ],
          },
        ]
      
        return (
          <div {...props} className={cn('flex w-full gap-2', props.className)}>
            {indicators.map((indicator) => (
              <WorkbenchTabsIndicator
                key={indicator.key}
                active={indicator.key === params.paramOne}
                icon={indicator.icon}
                label={indicator.label}
                tooltip={indicator.tooltip}
                value={indicator.value}
                onClick={() => {
                  if (indicator.key === params.paramOne) {
                    setParams({ paramOne: '', paramTwo: '' })
                  } else {
                    setParams({ paramOne: indicator.key })
                  }
                }}
              >
                {indicator.children.map((child) => (
                  <WorkbenchTabsIndicator.Item
                    key={child.key}
                    active={
                      indicator.key === params.paramOne &&
                      params.paramTwo === child.key
                    }
                    label={child.label}
                    tooltip={child.tooltip}
                    value={child.value}
                    warning={child.warning}
                    onClick={() => {
                      if (
                        indicator.key === params.paramOne &&
                        params.paramTwo === child.key
                      ) {
                        setParams({ paramTwo: '' })
                      } else {
                        setParams({ paramOne: indicator.key, paramTwo: child.key })
                      }
                    }}
                  />
                ))}
              </WorkbenchTabsIndicator>
            ))}
          </div>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/table/hooks/configs/tab-one.columns.ts
    out: apps/www2/registry/default/templates/workbench/components/left/table/hooks/configs/tab-one.columns.ts
    lang: ts
    template: |
      import type { ColumnsType } from '@imile/table'
      
      import type { TabOneTableItem } from '../../../../../types'
      
      export const getTabOneColumns = (): ColumnsType<TabOneTableItem> => [
        {
          title: 'Task',
          dataIndex: 'taskName',
          width: 220,
        },
        {
          title: 'Owner',
          dataIndex: 'owner',
          width: 180,
        },
        {
          title: 'Pending',
          dataIndex: 'pending',
          width: 120,
        },
        {
          title: 'Last update',
          dataIndex: 'updatedAt',
          width: 200,
        },
      ]

  - path: apps/www2/registry/default/templates/workbench/components/left/table/hooks/configs/tab-three.columns.ts
    out: apps/www2/registry/default/templates/workbench/components/left/table/hooks/configs/tab-three.columns.ts
    lang: ts
    template: |
      import type { ColumnsType } from '@imile/table'
      
      import type { TabThreeTableItem } from '../../../../../types'
      
      const severityLabel: Record<TabThreeTableItem['severity'], string> = {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
      }
      
      export const getTabThreeColumns = (): ColumnsType<TabThreeTableItem> => [
        {
          title: 'Alert',
          dataIndex: 'alert',
          width: 260,
        },
        {
          title: 'Severity',
          dataIndex: 'severity',
          width: 140,
          render: (value) => severityLabel[value as TabThreeTableItem['severity']],
        },
        {
          title: 'Affected orders',
          dataIndex: 'affectedOrders',
          width: 160,
        },
        {
          title: 'Last occurred',
          dataIndex: 'lastOccurredAt',
          width: 200,
        },
      ]

  - path: apps/www2/registry/default/templates/workbench/components/left/table/hooks/configs/tab-two.columns.ts
    out: apps/www2/registry/default/templates/workbench/components/left/table/hooks/configs/tab-two.columns.ts
    lang: ts
    template: |
      import type { ColumnsType } from '@imile/table'
      
      import type { TabTwoTableItem } from '../../../../../types'
      
      export const getTabTwoColumns = (): ColumnsType<TabTwoTableItem> => [
        {
          title: 'Route',
          dataIndex: 'route',
          width: 200,
        },
        {
          title: 'Vehicle',
          dataIndex: 'vehicle',
          width: 160,
        },
        {
          title: 'Planned departure',
          dataIndex: 'departure',
          width: 200,
        },
        {
          title: 'Delay (min)',
          dataIndex: 'delayMinutes',
          width: 140,
        },
      ]

  - path: apps/www2/registry/default/templates/workbench/components/left/table/hooks/use-tab-one-columns.ts
    out: apps/www2/registry/default/templates/workbench/components/left/table/hooks/use-tab-one-columns.ts
    lang: ts
    template: |
      'use client'
      
      import { useMemo } from 'react'
      
      import { getTabOneColumns } from './configs/tab-one.columns'
      
      export const useTabOneColumns = () => {
        return useMemo(() => getTabOneColumns(), [])
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/table/hooks/use-tab-three-columns.ts
    out: apps/www2/registry/default/templates/workbench/components/left/table/hooks/use-tab-three-columns.ts
    lang: ts
    template: |
      'use client'
      
      import { useMemo } from 'react'
      
      import { getTabThreeColumns } from './configs/tab-three.columns'
      
      export const useTabThreeColumns = () => {
        return useMemo(() => getTabThreeColumns(), [])
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/table/hooks/use-tab-two-columns.ts
    out: apps/www2/registry/default/templates/workbench/components/left/table/hooks/use-tab-two-columns.ts
    lang: ts
    template: |
      'use client'
      
      import { useMemo } from 'react'
      
      import { getTabTwoColumns } from './configs/tab-two.columns'
      
      export const useTabTwoColumns = () => {
        return useMemo(() => getTabTwoColumns(), [])
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/table/icon.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/table/icon.tsx
    lang: tsx
    template: |
      import { cn } from '@/lib/utils'
      
      export function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
        return (
          <svg fill="none" focusable="false" viewBox="0 0 14 14" {...props}>
            <path
              d="M7.13 2.58H13a1 1 0 011 .97v8.97a1 1 0 01-1 .98H1a1 1 0 01-1-.98V1.48A1 1 0 011 .5h4.13c.15 0 .27.05.37.17l1.63 1.9zm.22 2.71l2.13 2.08a.48.48 0 010 .68c-.18.2-.5.2-.7 0L7.5 6.8v3.7a.5.5 0 01-.5.48.5.5 0 01-.5-.49V6.78L5.22 8.03c-.17.2-.5.2-.7 0a.48.48 0 01-.14-.35c0-.12.04-.24.15-.34l2.12-2.07c.07-.1.17-.15.3-.15h.1l.08.02.04.03c.08.02.13.07.18.12z"
              fill="var(--workbench-left-table-upload-icon,var(--color-gray-8))"
              fillRule="evenodd"
            ></path>
          </svg>
        )
      }
      
      export function FeedbackIcon(props: React.SVGProps<SVGSVGElement>) {
        return (
          <svg
            className={cn(
              'ImileSvgIcon-root ImileSvgIcon-fontSizeMedium text-[32px]! cursor-pointer',
              props.className
            )}
            focusable="false"
            viewBox="0 0 33 32"
          >
            <path
              d="M0.245483 8C0.245483 4.22876 0.245483 2.34315 1.41706 1.17157C2.58863 0 4.47425 0 8.24548 0H24.2455C28.0167 0 29.9023 0 31.0739 1.17157C32.2455 2.34315 32.2455 4.22876 32.2455 8V24C32.2455 27.7712 32.2455 29.6569 31.0739 30.8284C29.9023 32 28.0167 32 24.2455 32H8.24548C4.47425 32 2.58863 32 1.41706 30.8284C0.245483 29.6569 0.245483 27.7712 0.245483 24V8Z"
              fill="var(--workbench-left-table-feedback-surface,var(--color-gray-2))"
            ></path>
            <path
              d="M12.5485 20.6667L9.5788 23V10.6667C9.5788 10.2985 9.87728 10 10.2455 10H22.2455C22.6137 10 22.9121 10.2985 22.9121 10.6667V20C22.9121 20.3682 22.6137 20.6667 22.2455 20.6667H12.5485ZM15.5788 16.6667V18H16.9121V16.6667H15.5788ZM15.5788 12.6667V16H16.9121V12.6667H15.5788Z"
              fill="var(--workbench-left-table-feedback-icon,var(--color-gray-10))"
            ></path>
          </svg>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/table/index.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/table/index.tsx
    lang: tsx
    template: |
      'use client'
      
      import type { ComponentType } from 'react'
      
      import { useWorkbenchStore } from '../../../stores/index.store'
      import type { TabValue } from '../../../types'
      import { TabOneTable } from './tab-one-table'
      import { TabThreeTable } from './tab-three-table'
      import { TabTwoTable } from './tab-two-table'
      
      const TABLE_COMPONENTS: Record<TabValue, ComponentType> = {
        '1': TabOneTable,
        '2': TabTwoTable,
        '3': TabThreeTable,
      }
      
      export function Table() {
        const activeTab = useWorkbenchStore((state) => state.tabs.activeTab)
        const Component = TABLE_COMPONENTS[activeTab]
      
        if (!Component) {
          return null
        }
      
        return <Component />
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/table/tab-one-table.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/table/tab-one-table.tsx
    lang: tsx
    template: |
      'use client'
      
      import { Maximize2, Settings } from 'lucide-react'
      
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { useAntdTable } from '@/registry/default/lib/query'
      import {
        FieldColumn,
        ProFieldsetDialog,
        useProFieldsetColumns,
      } from '@/registry/default/templates/workbench/blocks/ui/fieldset-dialog'
      import { ProFullScreenDialog } from '@/registry/default/ui/pro-fullscreen-dialog'
      import { Button } from '@/registry/default/ui/ui-button'
      
      import { queryKeys } from '../../../index.query-keys'
      import { getTabOneTableRows } from '../../../service'
      import { useWorkbenchStore } from '../../../stores/index.store'
      import { ExportButton } from '../../export-button'
      import { useTabOneColumns } from './hooks/use-tab-one-columns'
      import { WorkbenchTabTable } from './workbench-tab-table'
      
      const tableName = 'tab-one-table'
      
      export const TabOneTable = () => {
        const { t } = useTranslation()
        const initialColumns = useTabOneColumns()
        const tabOneParams = useWorkbenchStore((state) => state.indicatorOne.params)
        const { columns } = useProFieldsetColumns({
          columns: initialColumns as FieldColumn[],
          tableName,
        })
        const { tableProps } = useAntdTable({
          queryKey: queryKeys.tabOneTable({ ...tabOneParams }),
          queryFn: ({ pagination }) => {
            return getTabOneTableRows({
              currentPage: pagination.currentPage,
              showCount: pagination.showCount,
            })
          },
        })
      
        const tableContent = (
          <WorkbenchTabTable
            {...tableProps}
            borderType="border"
            columns={columns}
            columnSize={{
              size: 200,
              minSize: 120,
              maxSize: 320,
            }}
            defaultEllipsis={{
              body: true,
              header: false,
            }}
            pagination={{
              ...tableProps.pagination,
              showSizeChanger: true,
              showTotal: true,
            }}
            columnResizing
          />
        )
      
        return (
          <div className="relative flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-gray-13 text-sm font-semibold uppercase tracking-wide">
                {t('Pending Complete Offload')}
              </p>
      
              <div className="flex items-center gap-2">
                <ExportButton
                  exportAllParams={{
                    bizType: '23030618',
                    jobName: '一键导出订单列表',
                    system: 'tms',
                    queryContent: {
                      ...tabOneParams,
                    },
                  }}
                  exportSelectedParams={{
                    bizType: '23030618',
                    jobName: '一键导出订单列表',
                    system: 'tms',
                    queryContent: {
                      ...tabOneParams,
                    },
                  }}
                />
      
                <span aria-hidden="true" className="bg-gray-4 h-6 w-px" />
      
                <ProFieldsetDialog
                  columns={columns}
                  tableName={tableName}
                  trigger={
                    <Button
                      aria-label="Open table settings"
                      color="secondary"
                      size="medium"
                      type="button"
                      variant="contained"
                    >
                      <Button.Icon>
                        <Settings className="size-4" />
                      </Button.Icon>
                    </Button>
                  }
                  onConfirm={(columns) => {
                    console.log(columns)
                  }}
                />
      
                <ProFullScreenDialog
                  trigger={
                    <Button
                      aria-label="Enter fullscreen"
                      color="secondary"
                      size="medium"
                      type="button"
                      variant="contained"
                    >
                      <Button.Icon>
                        <Maximize2 className="size-4" />
                      </Button.Icon>
                    </Button>
                  }
                >
                  {tableContent}
                </ProFullScreenDialog>
              </div>
            </div>
      
            {tableContent}
          </div>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/table/tab-three-table.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/table/tab-three-table.tsx
    lang: tsx
    template: |
      'use client'
      
      import { Maximize2, Settings } from 'lucide-react'
      
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { useAntdTable } from '@/registry/default/lib/query'
      import {
        FieldColumn,
        ProFieldsetDialog,
        useProFieldsetColumns,
      } from '@/registry/default/templates/workbench/blocks/ui/fieldset-dialog'
      import { ProFullScreenDialog } from '@/registry/default/ui/pro-fullscreen-dialog'
      import { Button } from '@/registry/default/ui/ui-button'
      
      import { queryKeys } from '../../../index.query-keys'
      import { getTabThreeTableRows } from '../../../service'
      import { useWorkbenchStore } from '../../../stores/index.store'
      import { WorkbenchDrawer } from '../../drawer/drawer'
      import { ExportButton } from '../../export-button'
      import { useTabThreeColumns } from './hooks/use-tab-three-columns'
      import { FeedbackIcon } from './icon'
      import { WorkbenchTabTable } from './workbench-tab-table'
      
      const tableName = 'tab-three-table'
      export const TabThreeTable = () => {
        const { t } = useTranslation()
        const initialColumns = useTabThreeColumns()
        const tabThreeParams = useWorkbenchStore(
          (state) => state.indicatorThree.params
        )
        const { columns } = useProFieldsetColumns({
          columns: initialColumns as FieldColumn[],
          tableName,
        })
        const { tableProps } = useAntdTable({
          queryKey: queryKeys.tabThreeTable({ ...tabThreeParams }),
          queryFn: ({ pagination }) => {
            return getTabThreeTableRows({
              currentPage: pagination.currentPage,
              showCount: pagination.showCount,
            })
          },
        })
      
        const tableContent = (
          <WorkbenchTabTable
            {...tableProps}
            borderType="border"
            columns={columns}
            pagination={{
              ...tableProps.pagination,
              showSizeChanger: true,
              showTotal: true,
            }}
            columnResizing
          />
        )
        return (
          <div className="relative flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-gray-13 text-sm font-semibold uppercase tracking-wide">
                {t('tab-three-table')}
              </p>
              <div className="flex items-center gap-2">
                <WorkbenchDrawer
                  trigger={
                    <span>
                      <FeedbackIcon className="h-8 w-8" />
                    </span>
                  }
                />
                <ExportButton
                  exportAllParams={{
                    bizType: '23030618',
                    system: 'tms',
                    jobName: '一键导出订单列表',
                    queryContent: {
                      ...tabThreeParams,
                    },
                  }}
                  exportSelectedParams={{
                    bizType: '23030618',
                    jobName: '一键导出订单列表',
                    system: 'tms',
                    queryContent: {
                      ...tabThreeParams,
                    },
                  }}
                />
      
                <span aria-hidden="true" className="bg-gray-4 h-6 w-px" />
      
                <ProFieldsetDialog
                  columns={columns}
                  tableName={tableName}
                  trigger={
                    <Button
                      aria-label="Open table settings"
                      color="secondary"
                      size="medium"
                      type="button"
                      variant="contained"
                    >
                      <Button.Icon>
                        <Settings className="size-4" />
                      </Button.Icon>
                    </Button>
                  }
                  onConfirm={(columns) => {
                    console.log(columns)
                  }}
                />
      
                <ProFullScreenDialog
                  trigger={
                    <Button
                      aria-label="Enter fullscreen"
                      color="secondary"
                      size="medium"
                      type="button"
                      variant="contained"
                    >
                      <Button.Icon>
                        <Maximize2 className="size-4" />
                      </Button.Icon>
                    </Button>
                  }
                >
                  {tableContent}
                </ProFullScreenDialog>
              </div>
            </div>
      
            {tableContent}
          </div>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/table/tab-two-table.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/table/tab-two-table.tsx
    lang: tsx
    template: |
      'use client'
      
      import { Maximize2, Settings } from 'lucide-react'
      
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { useAntdTable } from '@/registry/default/lib/query'
      import {
        FieldColumn,
        ProFieldsetDialog,
        useProFieldsetColumns,
      } from '@/registry/default/templates/workbench/blocks/ui/fieldset-dialog'
      import { ProFullScreenDialog } from '@/registry/default/ui/pro-fullscreen-dialog'
      import { ProRealtimeFilter } from '@/registry/default/ui/pro-realtime-filter'
      import { Select } from '@/registry/default/ui/pro-select'
      import { Button } from '@/registry/default/ui/ui-button'
      
      import { queryKeys } from '../../../index.query-keys'
      import { getTabTwoTableRows } from '../../../service'
      import { useWorkbenchStore } from '../../../stores/index.store'
      import { ExportButton } from '../../export-button'
      import { useTabTwoColumns } from './hooks/use-tab-two-columns'
      import { WorkbenchTabTable } from './workbench-tab-table'
      
      const tableName = 'tab-two-table'
      
      export const TabTwoTable = () => {
        const { t } = useTranslation()
        const initialColumns = useTabTwoColumns()
        const tabTwoParams = useWorkbenchStore((state) => state.indicatorTwo.params)
        const { columns } = useProFieldsetColumns({
          columns: initialColumns as FieldColumn[],
          tableName,
        })
        const { tableProps } = useAntdTable({
          queryKey: queryKeys.tabTwoTable({ ...tabTwoParams }),
          queryFn: ({ pagination }) => {
            return getTabTwoTableRows({
              currentPage: pagination.currentPage,
              showCount: pagination.showCount,
            })
          },
        })
      
        const tableContent = (
          <WorkbenchTabTable
            {...tableProps}
            borderType="border"
            columns={columns}
            pagination={{
              ...tableProps.pagination,
              showSizeChanger: true,
              showTotal: true,
            }}
            columnResizing
          />
        )
      
        return (
          <div className="relative flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <ProRealtimeFilter defaultRowCount={1} itemMinWidth={180}>
                <ProRealtimeFilter.Item>
                  <Select
                    options={[
                      { label: '全部', value: 'all' },
                      { label: '进行中', value: 'progress' },
                      { label: '已完成', value: 'completed' },
                    ]}
                    placeholder={t('请选择状态')}
                    prefix={t('下架日期')}
                  />
                </ProRealtimeFilter.Item>
              </ProRealtimeFilter>
      
              <div className="flex items-center gap-2">
                <ExportButton
                  exportAllParams={{
                    bizType: '23030618',
                    jobName: '一键导出订单列表',
                    system: 'tms',
                    queryContent: {
                      ...tabTwoParams,
                    },
                  }}
                  exportSelectedParams={{
                    bizType: '23030618',
                    jobName: '一键导出订单列表',
                    system: 'tms',
                    queryContent: {
                      ...tabTwoParams,
                    },
                  }}
                />
      
                <span aria-hidden="true" className="bg-gray-4 h-6 w-px" />
      
                <ProFieldsetDialog
                  columns={columns}
                  tableName={tableName}
                  trigger={
                    <Button
                      aria-label="Open table settings"
                      color="secondary"
                      size="medium"
                      type="button"
                      variant="contained"
                    >
                      <Button.Icon>
                        <Settings className="size-4" />
                      </Button.Icon>
                    </Button>
                  }
                  onConfirm={(columns) => {
                    console.log(columns)
                  }}
                />
      
                <ProFullScreenDialog
                  trigger={
                    <Button
                      aria-label="Enter fullscreen"
                      color="secondary"
                      size="medium"
                      type="button"
                      variant="contained"
                    >
                      <Button.Icon>
                        <Maximize2 className="size-4" />
                      </Button.Icon>
                    </Button>
                  }
                >
                  {tableContent}
                </ProFullScreenDialog>
              </div>
            </div>
            {tableContent}
          </div>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/table/workbench-tab-table.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/table/workbench-tab-table.tsx
    lang: tsx
    template: |
      'use client'
      
      import { cn } from '@/lib/utils'
      import {
        Table as ImileTable,
        TableProps,
      } from '@/registry/default/ui/pro-table'
      
      const paginationClassName = 'absolute left-0 bottom-0 py-2.5 bg-white w-full'
      
      export const WorkbenchTabTable = ({ pagination, ...rest }: TableProps) => {
        const paginationWithClass = pagination
          ? {
              ...pagination,
              className: cn(paginationClassName, pagination.className),
            }
          : pagination
      
        return (
          <>
            <style>{`.ImileTable-Component{ margin-bottom: 47px; }`}</style>
            <ImileTable {...rest} pagination={paginationWithClass} />
          </>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/left/workbench-help-alert.tsx
    out: apps/www2/registry/default/templates/workbench/components/left/workbench-help-alert.tsx
    lang: tsx
    template: |
      'use client'
      
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import {
        Alert,
        AlertClose,
        AlertDescription,
        AlertTypeIcon,
        type AlertProps,
      } from '@/registry/default/ui/ui-alert'
      
      import { useWorkbenchStore } from '../../stores/index.store'
      
      interface WorkbenchHelpAlertProps
        extends Omit<AlertProps, 'variant' | 'status' | 'children'> {
        className?: string
        onDismiss?: () => void
      }
      
      const WorkbenchHelpAlert: React.FC<WorkbenchHelpAlertProps> = ({
        className,
        onDismiss,
        open: openProp,
        onOpenChange,
        ...rest
      }) => {
        const [open, setOpen] = React.useState(
          typeof openProp === 'boolean' ? openProp : true
        )
        const { t } = useTranslation()
        const activeTab = useWorkbenchStore((state) => state.tabs.activeTab)
        React.useEffect(() => {
          if (typeof openProp === 'boolean') {
            setOpen(openProp)
          }
        }, [openProp])
      
        const message = React.useMemo(() => {
          if (activeTab === 'tab-one') {
            return t('tabone提示')
          }
          return t('tabtwo提示')
        }, [activeTab, t])
      
        const handleOpenChange = React.useCallback(
          (next: boolean) => {
            setOpen(next)
            onOpenChange?.(next)
            if (!next) onDismiss?.()
          },
          [onDismiss, onOpenChange]
        )
      
        if (!open) return null
      
        return (
          <Alert
            {...rest}
            className={cn('items-center gap-3', className)}
            open={open}
            status="doubt"
            variant="local"
            disabledEllipsis
            onOpenChange={handleOpenChange}
          >
            <AlertTypeIcon className="mr-0 flex-none pr-0" />
            <AlertDescription className="text-gray-13 text-xs font-medium uppercase tracking-wide">
              {message}
            </AlertDescription>
            <AlertClose aria-label="关闭提示" />
          </Alert>
        )
      }
      
      WorkbenchHelpAlert.displayName = 'WorkbenchHelpAlert'
      
      export { WorkbenchHelpAlert }
      export type { WorkbenchHelpAlertProps }

  - path: apps/www2/registry/default/templates/workbench/components/narrow-browser-guide.tsx
    out: apps/www2/registry/default/templates/workbench/components/narrow-browser-guide.tsx
    lang: tsx
    template: |
      'use client'
      
      import { useState } from 'react'
      import { FocusGuide } from '@imile/guide'
      
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      
      import { useNarrowBrowserCallback } from '../hooks/use-narrow-browser-callback'
      
      /**
       *
       * @param collapseRef 折叠按钮的 ref
       * @returns 窄屏模式下的引导组件
       */
      export function NarrowBrowserGuide({
        collapseRef,
      }: {
        collapseRef: React.RefObject<HTMLButtonElement>
      }) {
        const [step, setStep] = useState(-1)
        const { t } = useTranslation()
        useNarrowBrowserCallback(() => {
          setStep(0)
        })
        return (
          <FocusGuide
            step={step}
            steps={[
              {
                target: () => collapseRef.current,
                placement: 'left',
                description: (
                  <div>
                    <div>1、{t('点击箭头可展开右侧内容')}</div>
                    <div>
                      2、
                      {t(
                        '若屏幕显示不佳，请调整浏览器窗口显示比例，快捷键：[“⌘”+”-”]'
                      )}
                    </div>
                  </div>
                ),
              },
            ]}
            onStepChange={(step) => setStep(step)}
          />
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/right/content.tsx
    out: apps/www2/registry/default/templates/workbench/components/right/content.tsx
    lang: tsx
    template: |
      'use client'
      
      import { useEffect, useMemo } from 'react'
      
      import { cn } from '@/lib/utils'
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { WorkbenchIndicator } from '@/registry/default/templates/workbench/blocks/ui/workbench-indicator'
      import { WorkbenchRight } from '@/registry/default/templates/workbench/blocks/ui/workbench-right'
      import { WenhaoIcon } from '@/registry/default/templates/workbench/blocks/ui/workbench-tabs-indicator'
      import { Tooltip } from '@/registry/default/ui/pro-tooltip'
      import { Pie, PieChart, type ChartConfig } from '@/registry/default/ui/ui-chart'
      
      import type { WorkbenchKpiStatus } from '../../utils'
      import { useWorkbenchRightStatus } from '../left/hooks/use-workbench-right-status'
      import { useWorkbenchKpiStatus } from './hooks/use-workbench-kpi-status'
      
      const KPI_STATUS_PALETTE: Record<
        WorkbenchKpiStatus,
        { completedColor: string; remainingColor: string }
      > = {
        normal: {
          completedColor: 'var(--chart-3)',
          remainingColor: 'var(--chart-4)',
        },
        warning: {
          completedColor: 'var(--chart-5)',
          remainingColor: 'var(--chart-6)',
        },
        error: {
          completedColor: 'var(--color-red-5)',
          remainingColor: 'var(--color-red-2)',
        },
      }
      
      export function WorkbenchRightContent() {
        const { data, isLoading, contentStatus } = useWorkbenchKpiStatus()
        const { t } = useTranslation()
        const { setContentStatus } = useWorkbenchRightStatus()
      
        useEffect(() => {
          setContentStatus(contentStatus)
        }, [contentStatus, setContentStatus])
      
        const percentDisplay =
          isLoading || data?.kpiPercent === undefined
            ? '--'
            : data.kpiPercent.toFixed(2)
      
        const chartData = useMemo(() => {
          const palette =
            KPI_STATUS_PALETTE[contentStatus] ?? KPI_STATUS_PALETTE.normal
          const percent = Math.min(100, Math.max(0, data?.kpiPercent ?? 0))
      
          return [
            {
              name: 'completed',
              value: percent,
              fill: palette.completedColor,
            },
            {
              name: 'remaining',
              value: 100 - percent,
              fill: palette.remainingColor,
            },
          ]
        }, [contentStatus, data?.kpiPercent])
      
        const chartConfig = useMemo<ChartConfig>(() => {
          const palette =
            KPI_STATUS_PALETTE[contentStatus] ?? KPI_STATUS_PALETTE.normal
      
          return {
            completed: {
              label: '已完成',
              color: palette.completedColor,
            },
            remaining: {
              label: '剩余',
              color: palette.remainingColor,
            },
          }
        }, [contentStatus])
      
        return (
          <div className="flex flex-col p-3">
            <div className="mb-3 flex justify-between">
              <div className="flex flex-col justify-around">
                <div className="flex items-center gap-0.5">
                  <div className="justify-start font-['SF_Pro_Text'] text-xs font-semibold capitalize leading-5 text-neutral-900">
                    {t('Key Performance Indicator')}
                  </div>
                  <Tooltip placement="top-center" title="Key Performance Indicator">
                    <span
                      className={cn(
                        'text-gray-5 flex h-[14px] w-[14px] shrink-0 items-center justify-center text-[12px]'
                      )}
                    >
                      <WenhaoIcon />
                    </span>
                  </Tooltip>
                </div>
                <div className="inline-flex items-start justify-start gap-0.5 self-stretch">
                  <div className="flex flex-1 items-end justify-start gap-0.5">
                    <div className="justify-start font-['TCloudNumber'] text-3xl font-bold leading-8 text-neutral-900">
                      {percentDisplay}
                    </div>
                    <div className="justify-start font-['SF_Pro_Text'] text-base font-semibold capitalize leading-6 text-gray-700">
                      %
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="chart-theme-lt20 relative h-[72px] w-[72px]">
                  <PieChart className="h-full w-full" config={chartConfig}>
                    <Pie data={chartData} dataKey="value" nameKey="name" />
                  </PieChart>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col rounded bg-white px-2.5 py-3">
                <WorkbenchRight.Title>{t('今日重点工作')}</WorkbenchRight.Title>
                <WorkbenchIndicator count={data?.task1} tooltip={t('任务1')}>
                  {t('任务1')}
                </WorkbenchIndicator>
                <WorkbenchIndicator count={data?.task2} tooltip={t('任务2')}>
                  {t('任务2')}
                </WorkbenchIndicator>
                <WorkbenchIndicator count={data?.task3} tooltip={t('任务3')}>
                  {t('任务3')}
                </WorkbenchIndicator>
                <WorkbenchIndicator count={data?.task4} tooltip={t('任务4')}>
                  {t('任务4')}
                </WorkbenchIndicator>
                <WorkbenchIndicator count={data?.task5} tooltip={t('任务5')}>
                  {t('任务5')}
                </WorkbenchIndicator>
              </div>
              <div className="flex flex-col rounded bg-white px-2.5 py-3">
                <WorkbenchRight.Title>{t('待处理任务')}</WorkbenchRight.Title>
                <WorkbenchIndicator
                  count={data?.pendingTask1}
                  tooltip={t('待处理任务1')}
                >
                  {t('待处理任务1')}
                </WorkbenchIndicator>
                <WorkbenchIndicator
                  count={data?.pendingTask2}
                  tooltip={t('待处理任务2')}
                >
                  {t('待处理任务2')}
                </WorkbenchIndicator>
                <WorkbenchIndicator
                  count={data?.pendingTask3}
                  tooltip={t('待处理任务3')}
                >
                  {t('待处理任务3')}
                </WorkbenchIndicator>
              </div>
            </div>
          </div>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/right/finish-work-confirm.tsx
    out: apps/www2/registry/default/templates/workbench/components/right/finish-work-confirm.tsx
    lang: tsx
    template: |
      'use client'
      
      import dayjs from 'dayjs'
      
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { Button } from '@/registry/default/ui/ui-button'
      import {
        Dialog,
        DialogClose,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle,
      } from '@/registry/default/ui/ui-dialog'
      import { toast as message } from '@/registry/default/ui/ui-message'
      
      import {
        useTaskPerformanceFinish,
        useTaskPerformanceInfo,
      } from '../../hooks/use-task-performance'
      import { useWorkbenchStore } from '../../stores/index.store'
      
      /**
       * 结束工作确认
       */
      export function FinishWorkConfirm() {
        const { t } = useTranslation()
        const { data } = useTaskPerformanceInfo()
        const { mutateAsync: finishWork } = useTaskPerformanceFinish()
      
        const { open, setOpen, closeDialog, pendingFinishTime } = useWorkbenchStore(
          (state) => state.finishWorkConfirm
        )
      
        const formattedFinishTime = (() => {
          const targetTime = pendingFinishTime ?? data?.performanceFinishTime ?? null
      
          if (!targetTime) {
            return '--'
          }
      
          return dayjs(targetTime).format('DD/MM/YYYY HH:mm:ss')
        })()
      
        const handleCancel = () => {
          closeDialog()
        }
      
        const handleFinishWork = async () => {
          try {
            await finishWork()
            message.success(t('结束工作了'))
            closeDialog()
          } catch (error) {
            console.error('结束工作失败:', error)
          }
        }
      
        return (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-96">
              <DialogHeader>
                <DialogTitle>{t('确认结束工作')}?</DialogTitle>
      
                <DialogDescription>
                  {t('当前时间')}：{formattedFinishTime},{t('现在确认要结束工作吗')}?
                </DialogDescription>
              </DialogHeader>
      
              <DialogFooter>
                <DialogClose asChild>
                  <Button color="secondary" onClick={handleCancel}>
                    {t('取消')}
                  </Button>
                </DialogClose>
                <Button color="primary" onClick={handleFinishWork}>
                  {t('立即结束')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/right/head.tsx
    out: apps/www2/registry/default/templates/workbench/components/right/head.tsx
    lang: tsx
    template: |
      /* eslint-disable @next/next/no-img-element */
      'use client'
      
      import * as React from 'react'
      
      import { cn } from '@/lib/utils'
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      
      import { useTaskPerformanceInfo } from '../../hooks/use-task-performance'
      import { useWorkbenchStore } from '../../stores/index.store'
      
      const MOCK_SUPERVISOR = {
        role: '归班主管',
        name: '李敏',
        startTime: '2024-11-05 09:30',
        avatarInitials: 'LM',
      }
      
      const DEFAULT_FINISH_ICON = (
        <svg
          className="ImileSvgIcon-root ImileSvgIcon-fontSizeMedium l-1hgkkrx h-[14px] w-[14px]"
          focusable="false"
          viewBox="0 0 15 14"
        >
          <path
            d="M8.39355 2.91667L8.39355 7.58333L7.22689 7.58333L7.22689 2.91667L5.47689 2.91667L7.81022 -2.54983e-07L10.1436 2.91667L8.39355 2.91667ZM4.31022 2.33291L4.31022 3.9132C3.58415 4.73586 3.14355 5.81648 3.14355 7C3.14355 9.57734 5.23288 11.6667 7.81022 11.6667C10.3876 11.6667 12.4769 9.57734 12.4769 7C12.4769 5.81648 12.0363 4.73586 11.3102 3.9132L11.3102 2.33291C12.7271 3.39715 13.6436 5.09154 13.6436 7C13.6436 10.2216 11.0319 12.8333 7.81022 12.8333C4.58859 12.8333 1.97689 10.2216 1.97689 7C1.97689 5.09154 2.89336 3.39715 4.31022 2.33291Z"
            fill="var(--workbench-right-head-finish-icon,var(--color-primary-foreground))"
          ></path>
        </svg>
      )
      
      const DEFAULT_START_ICON = (
        <svg
          fill="none"
          height="24"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 8C0 4.22876 0 2.34315 1.17157 1.17157C2.34315 0 4.22876 0 8 0H16C19.7712 0 21.6569 0 22.8284 1.17157C24 2.34315 24 4.22876 24 8V16C24 19.7712 24 21.6569 22.8284 22.8284C21.6569 24 19.7712 24 16 24H8C4.22876 24 2.34315 24 1.17157 22.8284C0 21.6569 0 19.7712 0 16V8Z"
            fill="var(--workbench-right-head-start-icon,var(--color-primary))"
          />
          <path
            d="M6.75 12.0001H9.08333V17.2501H6.75V12.0001ZM14.9167 9.66675H17.25V17.2501H14.9167V9.66675ZM10.8333 6.16675H13.1667V17.2501H10.8333V6.16675Z"
            fill="var(--workbench-right-head-start-icon-foreground,var(--color-primary-foreground))"
          />
        </svg>
      )
      
      const WorkbenchRightHead = (props: React.HTMLAttributes<HTMLDivElement>) => {
        const { className, ...rest } = props
        const info = MOCK_SUPERVISOR
        const { t } = useTranslation()
        const { data: taskPerformanceInfo, isFetched } = useTaskPerformanceInfo()
        const { openDialog: openFinishDialog } = useWorkbenchStore(
          (state) => state.finishWorkConfirm
        )
        const { openDialog: openStartDialog } = useWorkbenchStore(
          (state) => state.startWorkConfirm
        )
        const isStarted =
          isFetched && Boolean(taskPerformanceInfo?.performanceStartTime)
        const handleStartWork = () => {
          openStartDialog()
        }
        return (
          <div
            className={cn(
              'flex items-center justify-between rounded-lg border bg-white p-4',
              className
            )}
            {...rest}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--workbench-right-head-avatar-from,var(--color-primary-3))] to-[color:var(--workbench-right-head-avatar-to,var(--color-primary))] text-sm font-semibold text-[color:var(--workbench-right-head-avatar-foreground,var(--color-primary-foreground))]">
                <img
                  alt="头像"
                  className="rounded-full"
                  src="https://test-ds-slave.52imile.cn/static/avatar.c6bed5a7.png"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-gray-13 text-sm font-semibold">
                  {info.role}
                </span>
                <span className="text-gray-7 text-xs">
                  {t('开始时间')}：{info.startTime || '--'}
                </span>
              </div>
            </div>
            <button
              aria-label={isStarted ? t('结束工作') : t('开始工作')}
              className="bg-red-6 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md"
              type="button"
              onClick={() => {
                if (isStarted) {
                  openFinishDialog()
                  return
                }
                handleStartWork()
              }}
            >
              {isStarted ? DEFAULT_FINISH_ICON : DEFAULT_START_ICON}
            </button>
          </div>
        )
      }
      
      WorkbenchRightHead.displayName = 'WorkbenchRightHead'
      
      export { WorkbenchRightHead }

  - path: apps/www2/registry/default/templates/workbench/components/right/hooks/use-workbench-kpi-status.ts
    out: apps/www2/registry/default/templates/workbench/components/right/hooks/use-workbench-kpi-status.ts
    lang: ts
    template: |
      'use client'
      
      import { useMemo } from 'react'
      
      import { getWorkbenchKpiStatus } from '../../../utils'
      import { useWorkbenchMetrics } from './use-workbench-metrics'
      
      export const useWorkbenchKpiStatus = () => {
        const queryResult = useWorkbenchMetrics()
      
        const contentStatus = useMemo(() => {
          const percent = queryResult.data?.kpiPercent
      
          if (percent === undefined) {
            return 'normal'
          }
      
          return getWorkbenchKpiStatus(percent)
        }, [queryResult.data?.kpiPercent])
      
        return { ...queryResult, contentStatus }
      }

  - path: apps/www2/registry/default/templates/workbench/components/right/hooks/use-workbench-metrics.ts
    out: apps/www2/registry/default/templates/workbench/components/right/hooks/use-workbench-metrics.ts
    lang: ts
    template: |
      'use client'
      
      import { useQuery } from '@/registry/default/lib/query'
      
      import { queryKeys } from '../../../index.query-keys'
      import { getWorkbenchMetrics } from '../../../service'
      import type { WorkbenchMetrics } from '../../../types'
      
      export const useWorkbenchMetrics = () =>
        useQuery<WorkbenchMetrics>({
          queryKey: queryKeys.metrics({}),
          queryFn: () => getWorkbenchMetrics(),
        })

  - path: apps/www2/registry/default/templates/workbench/components/right/index.tsx
    out: apps/www2/registry/default/templates/workbench/components/right/index.tsx
    lang: tsx
    template: |
      'use client'
      
      import { WorkbenchRight } from '@/registry/default/templates/workbench/blocks/ui/workbench-right'
      
      import { useWorkbenchRightStatus } from '../left/hooks/use-workbench-right-status'
      import { WorkbenchRightContent } from './content'
      import { WorkbenchRightHead } from './head'
      
      export function Right() {
        const { contentStatus } = useWorkbenchRightStatus()
      
        return (
          <WorkbenchRight contentStatus={contentStatus}>
            <WorkbenchRightHead />
            <WorkbenchRightContent />
          </WorkbenchRight>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/components/right/start-work-confirm.tsx
    out: apps/www2/registry/default/templates/workbench/components/right/start-work-confirm.tsx
    lang: tsx
    template: |
      'use client'
      
      import { useEffect, useState } from 'react'
      import dayjs from 'dayjs'
      
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      import { Button } from '@/registry/default/ui/ui-button'
      import {
        Dialog,
        DialogClose,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle,
      } from '@/registry/default/ui/ui-dialog'
      import { Toaster, toast } from '@/registry/default/ui/ui-message'
      
      import {
        useTaskPerformanceInfo,
        useTaskPerformanceStart,
      } from '../../hooks/use-task-performance'
      import { useWorkbenchStore } from '../../stores/index.store'
      
      /**
       * 开始工作确认
       */
      export function StartWorkConfirm() {
        const { t } = useTranslation()
        const { data, isFetched } = useTaskPerformanceInfo()
        const { mutateAsync: startWork } = useTaskPerformanceStart()
        const [hasAutoOpened, setHasAutoOpened] = useState(false)
      
        const { open, setOpen, openDialog, closeDialog } = useWorkbenchStore(
          (state) => state.startWorkConfirm
        )
        useEffect(() => {
          if (isFetched && !data?.performanceStartTime && !hasAutoOpened) {
            setHasAutoOpened(true)
            openDialog()
          }
        }, [isFetched, data?.performanceStartTime, openDialog, hasAutoOpened])
      
        const handleCancel = () => {
          closeDialog()
        }
      
        const handleStartWork = async () => {
          try {
            await startWork()
            toast.success(t('开始工作了'))
            closeDialog()
          } catch (error) {
            console.error('打卡失败:', error)
          }
        }
      
        return (
          <>
            <Toaster />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="w-96">
                <DialogHeader>
                  <DialogTitle>{t('确认开始工作')}?</DialogTitle>
      
                  <DialogDescription>
                    {t('当前时间')}：{dayjs().format('YYYY-MM-DD HH:mm:ss')},
                    {t('现在确认要开始工作吗')}?
                  </DialogDescription>
                </DialogHeader>
      
                <DialogFooter>
                  <DialogClose asChild>
                    <Button color="secondary" onClick={handleCancel}>
                      {t('取消')}
                    </Button>
                  </DialogClose>
                  <Button color="primary" onClick={handleStartWork}>
                    {t('立即开始')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/hooks/use-narrow-browser-callback.ts
    out: apps/www2/registry/default/templates/workbench/hooks/use-narrow-browser-callback.ts
    lang: ts
    template: |
      'use client'
      
      import { useLatest, useMount } from 'ahooks'
      
      const NARROW_BREAKPOINT = 1366
      
      /**
       * 当组件挂载后，如果浏览器宽度小于等于 1366px，则立即执行传入回调。
       */
      const useNarrowBrowserCallback = (callback: () => void | Promise<void>) => {
        const latestCallback = useLatest(callback)
      
        useMount(() => {
          if (typeof window === 'undefined') {
            return
          }
      
          if (window.innerWidth <= NARROW_BREAKPOINT) {
            void latestCallback.current?.()
          }
        })
      }
      
      export { useNarrowBrowserCallback }

  - path: apps/www2/registry/default/templates/workbench/hooks/use-tab-definitions.ts
    out: apps/www2/registry/default/templates/workbench/hooks/use-tab-definitions.ts
    lang: ts
    template: |
      'use client'
      
      import { useMemo } from 'react'
      
      import { useTranslation } from '@/registry/default/hooks/use-translation'
      
      import type { TabId, TabValue } from '../types'
      
      export type WorkbenchTabDefinition = {
        id: TabId
        value: TabValue
        label: string
        variant: 'start' | 'middle' | 'end'
        icon: string
      }
      
      export const useTabDefinitions = (): ReadonlyArray<WorkbenchTabDefinition> => {
        const { t } = useTranslation()
      
        return useMemo(() => {
          return [
            {
              id: 'tabOne',
              value: '1',
              variant: 'start',
              icon: '📦',
              label: t('tabOne'),
            },
            {
              id: 'tabTwo',
              value: '2',
              variant: 'middle',
              icon: '🚚',
              label: t('tabTwo'),
            },
            {
              id: 'tabThree',
              value: '3',
              variant: 'end',
              icon: '⚠️',
              label: t('tabThree'),
            },
          ]
        }, [t])
      }
      
      export const useTabIds = () => {
        const tabOptions = useTabDefinitions()
        return useMemo(() => {
          return tabOptions.map((item) => item.id)
        }, [tabOptions])
      }

  - path: apps/www2/registry/default/templates/workbench/hooks/use-task-performance.ts
    out: apps/www2/registry/default/templates/workbench/hooks/use-task-performance.ts
    lang: ts
    template: |
      'use client'
      
      import {
        useMutation,
        useQuery,
        useQueryClient,
      } from '@/registry/default/lib/query'
      
      import { queryKeys } from '../index.query-keys'
      import {
        finishTaskPerformance,
        getTaskPerformanceInfo,
        startTaskPerformance,
      } from '../service'
      import type { TaskPerformanceInfo } from '../types'
      
      export const useTaskPerformanceInfo = () => {
        return useQuery<TaskPerformanceInfo>({
          queryKey: queryKeys.taskPerformanceInfo({}),
          queryFn: () => getTaskPerformanceInfo(),
        })
      }
      
      const useTaskPerformanceMutation = (
        mutationFn: () => Promise<TaskPerformanceInfo>
      ) => {
        const queryClient = useQueryClient()
      
        return useMutation<TaskPerformanceInfo>({
          mutationFn,
          onSuccess: (data) => {
            queryClient.setQueryData(queryKeys.taskPerformanceInfo({}), data)
          },
          onError(error) {
            console.error(error)
          },
        })
      }
      
      export const useTaskPerformanceStart = () =>
        useTaskPerformanceMutation(startTaskPerformance)
      
      export const useTaskPerformanceFinish = () =>
        useTaskPerformanceMutation(finishTaskPerformance)

  - path: apps/www2/registry/default/templates/workbench/index.page.PROMPT.md
    out: apps/www2/registry/default/templates/workbench/index.page.PROMPT.md
    lang: md
    template: |
      # Workbench 模板使用提要
      
      ## 输出目标
      
      - 1440px 桌面工作台，帮助运营/调度在一屏内查看 KPI、任务、播报、排期。
      - 视觉基调：浅灰渐变背景、24px 圆角卡片、深色高亮异常/选中状态。
      
      ## 布局
      
      1. 用 `WorkbenchLayout` 包裹左右双栏（children 依次为左/右），`breakpoint=1440`，窄屏自动折叠右栏。
      2. 右栏请使用 `WorkbenchRight` 的 `top` / `content` props 分出头部与主体。
      
      ### 左栏内容
      
      - 4 个 `WorkbenchIndicator`（展示数值、环比、tooltip）。
      - 3 组 `WorkbenchTabsIndicator`，可标记 warning。
      - `ProWorkbenchTabs` 控制下方任务列表。
      - 任务表格区：`ProWorkbenchTableFullScreen` + 状态胶囊、进度条、标签；底部放 4 个快捷入口按钮。
      
      ### 右栏内容
      
      - 实时播报列表：时间、标题、详情、可选徽标。
      - 今日排期卡片：时间、主持人、说明。
      - 旺季准备度提示卡：深色渐变背景 + CTA。
      
      ## 数据与交互
      
      - 全部文案用中文，指标数值/百分比看起来像真实运营数据（例：`97.2%`、`1,248`）。
      - 指标、任务、播报、排期、快捷入口均由常量数组驱动，方便后续接入接口。
      - `ProWorkbenchTableFullScreen` 绑定 `ref`，启用全屏按钮与 `Shift + F` 快捷提示。
      
      ## 实现清单
      
      - 文件：`index.page.tsx`，顶部声明 `use client`，默认导出组件命名为 `WorkBenchTemplate`。
      - 引入：`WorkbenchLayout`、`ProWorkbenchTabs`、`ProWorkbenchTableFullScreen`、`WorkbenchIndicator`、`WorkbenchTabsIndicator` 均来自 `@/registry/default/ui/*`。
      - Tailwind：保持浅灰渐变背景、卡片轻量阴影，异常态使用玫红色，选中或重点信息用深色强调。
      
      ## 接入说明
      
      - 该模板仅提供页面骨架；交付时请根据真实业务命名页面文件与组件。
      - Tabs、TabIndicator、HelpAlert、表格列定义、右侧头部与主体文案、任何 mock 数据都必须替换成接口返回的数据或产品文案。
      - 与后端联调时，以常量数组/对象为“单一入口”，确保后续替换只需改动数据层。
      - 若缺少接口描述，可通过 itp MCP（`itp__get_api_detail`、`itp__get_system_apis` 等）检索对应接口文档，确认字段含义后再接入。
      
      ## 页面示例
      
      ```tsx
      /* eslint-disable @next/next/no-img-element */
      'use client'
      
      import { useRef } from 'react'
      
      import { WorkbenchLayout } from '@/registry/default/templates/workbench/blocks/ui/workbench-layout'
      import { WorkbenchRight } from '@/registry/default/templates/workbench/blocks/ui/workbench-right'
      
      import { LeftTabs } from './components/left/left-tabs'
      import { TabIndicator } from './components/left/tab-indicator'
      import { Table } from './components/left/table'
      import { WorkbenchHelpAlert } from './components/left/workbench-help-alert'
      import { NarrowBrowserGuide } from './components/narrow-browser-guide'
      import { WorkbenchRightContent } from './components/right/content'
      import { FinishWorkConfirm } from './components/right/finish-work-confirm'
      import { WorkbenchRightHead } from './components/right/head'
      import { StartWorkConfirm } from './components/right/start-work-confirm'
      
      export default function WorkBenchTemplate() {
        const collapseRef = useRef<HTMLButtonElement | null>(null)
      
        return (
          <div className="h-full w-full p-3">
            <WorkbenchLayout ref={collapseRef}>
              <div className="flex h-full w-full flex-col overflow-y-auto rounded-sm bg-white p-3 pb-0">
                <LeftTabs className="mb-3" />
                <TabIndicator className="mb-3" />
                <WorkbenchHelpAlert className="mb-3" />
                <Table />
              </div>
      
              <WorkbenchRight>
                <WorkbenchRightHead />
                <WorkbenchRightContent />
              </WorkbenchRight>
            </WorkbenchLayout>
            <NarrowBrowserGuide collapseRef={collapseRef} />
            <StartWorkConfirm />
            <FinishWorkConfirm />
          </div>
        )
      }
      ```

  - path: apps/www2/registry/default/templates/workbench/index.page.tsx
    out: apps/www2/registry/default/templates/workbench/index.page.tsx
    lang: tsx
    template: |
      /* eslint-disable @next/next/no-img-element */
      'use client'
      
      import { useRef } from 'react'
      
      import { WorkbenchLayout } from '@/registry/default/templates/workbench/blocks/ui/workbench-layout'
      import { WorkbenchRight } from '@/registry/default/templates/workbench/blocks/ui/workbench-right'
      
      import { LeftTabs } from './components/left/left-tabs'
      import { TabIndicator } from './components/left/tab-indicator'
      import { Table } from './components/left/table'
      import { WorkbenchHelpAlert } from './components/left/workbench-help-alert'
      import { NarrowBrowserGuide } from './components/narrow-browser-guide'
      import { WorkbenchRightContent } from './components/right/content'
      import { FinishWorkConfirm } from './components/right/finish-work-confirm'
      import { WorkbenchRightHead } from './components/right/head'
      import { StartWorkConfirm } from './components/right/start-work-confirm'
      import { useWorkbenchStore } from './stores/index.store'
      
      export default function WorkBenchTemplate() {
        const collapseRef = useRef<HTMLButtonElement | null>(null)
        const collapsed = useWorkbenchStore((state) => state.layout.collapsed)
        const setCollapsed = useWorkbenchStore((state) => state.layout.setCollapsed)
      
        return (
          <div className="h-full w-full overflow-x-auto p-3">
            <WorkbenchLayout
              ref={collapseRef}
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
            >
              {/* 工作台布局-左侧区域 */}
              <div className="flex h-full w-full flex-col overflow-y-auto rounded-sm bg-white p-3 pb-0">
                <LeftTabs className="mb-3" />
                <TabIndicator className="mb-3" />
                <WorkbenchHelpAlert className="mb-3" />
                <Table />
              </div>
      
              {/* 工作台布局-右侧区域 */}
              <WorkbenchRight>
                {/* 右侧容器-顶部区域 */}
                <WorkbenchRightHead />
                {/* 右侧容器-主体内容 */}
                <WorkbenchRightContent />
              </WorkbenchRight>
            </WorkbenchLayout>
            {/* 窄浏览器引导 */}
            <NarrowBrowserGuide collapseRef={collapseRef} />
            {/* 开始工作确认 */}
            <StartWorkConfirm />
            {/* 结束工作确认 */}
            <FinishWorkConfirm />
          </div>
        )
      }

  - path: apps/www2/registry/default/templates/workbench/index.query-keys.ts
    out: apps/www2/registry/default/templates/workbench/index.query-keys.ts
    lang: ts
    template: |
      // index.query-keys.ts
      import { createQueryKeys } from '@/registry/default/lib/query'
      
      export const queryKeys = createQueryKeys('Workbench', {
        tabsData: (p) => p,
        taskPerformanceInfo: (p) => p,
        metrics: (p) => p,
        tabOneIndicator: (p) => p,
        tabTwoIndicator: (p) => p,
        tabThreeIndicator: (p) => p,
        tabOneTable: (p) => p,
        tabTwoTable: (p) => p,
        tabThreeTable: (p) => p,
        drawerTable: (p) => p,
      })

  - path: apps/www2/registry/default/templates/workbench/meta.json
    out: apps/www2/registry/default/templates/workbench/meta.json
    lang: json
    template: |
      {
        "dependencies": ["zustand"],
        "registryDependencies": [
          "workbench-layout",
          "workbench-indicator",
          "workbench-tabs-indicator",
          "workbench-tabs",
          "workbench-table-full-screen",
          "fieldset-dialog",
          "workbench-right",
          "pro-table",
          "pro-dropdown-menu",
          "pro-realtime-filter",
          "ui-chart",
          "ui-fullscreen-dialog",
          "pro-fullscreen-dialog"
        ],
        "description": "运营工作台模板，整合指标看板、任务推进、实时播报与排期提醒，适配 1440px 桌面大屏与窄屏折叠场景。",
        "tags": ["workbench", "dashboard", "运营", "工作台"]
      }

  - path: apps/www2/registry/default/templates/workbench/service/index.ts
    out: apps/www2/registry/default/templates/workbench/service/index.ts
    lang: ts
    template: |
      // TODO: 目录内的服务均为 MOCK 实现，集成真实后端时请替换为接口调用。
      
      export { getTabsData } from './tabs-data.service'
      
      export {
        getDrawerTableRows,
        getTabOneTableRows,
        getTabThreeTableRows,
        getTabTwoTableRows,
      } from './tab-tables.service'
      
      export {
        getTabOneIndicatorValues,
        getTabThreeIndicatorValues,
        getTabTwoIndicatorValues,
      } from './tab-indicators.service'
      
      export { getWorkbenchMetrics } from './metrics.service'
      
      export {
        finishTaskPerformance,
        getTaskPerformanceInfo,
        startTaskPerformance,
      } from './task-performance.service'

  - path: apps/www2/registry/default/templates/workbench/service/metrics.service.ts
    out: apps/www2/registry/default/templates/workbench/service/metrics.service.ts
    lang: ts
    template: |
      import type { WorkbenchMetrics } from '../types'
      
      // TODO: 暂用 MOCK_METRICS，落地时改为真实 KPI 指标接口。
      
      const MOCK_METRICS: WorkbenchMetrics = {
        kpiPercent: 92.12,
        task1: 132,
        task2: 87,
        task3: 56,
        task4: 210,
        task5: 0,
        pendingTask1: 17,
        pendingTask2: 8,
        pendingTask3: 3,
      }
      
      export const getWorkbenchMetrics = (): Promise<WorkbenchMetrics> =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ...MOCK_METRICS })
          }, 300)
        })

  - path: apps/www2/registry/default/templates/workbench/service/pagination.ts
    out: apps/www2/registry/default/templates/workbench/service/pagination.ts
    lang: ts
    template: |
      import type { TablePaginationParams, WorkbenchTableResponse } from '../types'
      
      export const paginate = <T>(
        rows: T[],
        pagination: TablePaginationParams = {}
      ): WorkbenchTableResponse<T> => {
        const currentPage = Math.max(1, pagination.currentPage ?? 1)
        const showCount = Math.max(1, pagination.showCount ?? rows.length)
        const start = (currentPage - 1) * showCount
        const end = start + showCount
        const subset = rows.slice(start, end).map((item) => ({ ...item }))
        const totalPage = Math.max(1, Math.ceil(rows.length / showCount))
      
        return {
          results: subset,
          pagination: {
            currentPage,
            totalPage,
            showCount: subset.length,
            totalResult: rows.length,
          },
        }
      }

  - path: apps/www2/registry/default/templates/workbench/service/tab-indicators.service.ts
    out: apps/www2/registry/default/templates/workbench/service/tab-indicators.service.ts
    lang: ts
    template: |
      import type { TabIndicatorResponse } from '../types'
      
      // TODO: 这里的指标数据仍为 MOCK，占位用，交付时替换为真实接口返回。
      
      const cloneIndicatorData = (data: TabIndicatorResponse): TabIndicatorResponse =>
        Object.fromEntries(
          Object.entries(data).map(([key, snapshot]) => [
            key,
            {
              value: snapshot.value,
              children: { ...snapshot.children },
            },
          ])
        ) as TabIndicatorResponse
      
      const TAB_ONE_INDICATOR_DATA = {
        warehouse: {
          value: 162,
          children: {
            'picking-delay': 6,
            sorting: 2,
            loading: 94,
          },
        },
        delivery: {
          value: 2846,
          children: {
            courier: 312,
            overdue: 24,
            signed: 92,
          },
        },
        exception: {
          value: 48,
          children: {
            damage: 9,
            reject: 12,
            reattach: 5,
          },
        },
      } satisfies TabIndicatorResponse
      
      const TAB_TWO_INDICATOR_DATA = {
        linehaul: {
          value: 1284,
          children: {
            departure: 97,
            'transit-delay': 14,
            capacity: 81,
          },
        },
        hub: {
          value: 768,
          children: {
            inbound: 126,
            'outbound-delay': 18,
            exceptions: 32,
          },
        },
        cost: {
          value: 182,
          children: {
            fuel: 62,
            toll: 38,
            'abnormal-expense': 7.6,
          },
        },
      } satisfies TabIndicatorResponse
      
      const TAB_THREE_INDICATOR_DATA = {
        'customer-service': {
          value: 98.2,
          children: {
            'first-response': 36,
            resolution: 91,
            complaint: 8,
          },
        },
        merchant: {
          value: 1096,
          children: {
            'active-merchants': 864,
            'sla-breach': 22,
            gmv: 12,
          },
        },
        feedback: {
          value: 426,
          children: {
            nps: 47,
            survey: 62,
            'feature-request': 19,
          },
        },
      } satisfies TabIndicatorResponse
      
      export const getTabOneIndicatorValues = (): Promise<TabIndicatorResponse> =>
        Promise.resolve(cloneIndicatorData(TAB_ONE_INDICATOR_DATA))
      
      export const getTabTwoIndicatorValues = (): Promise<TabIndicatorResponse> =>
        Promise.resolve(cloneIndicatorData(TAB_TWO_INDICATOR_DATA))
      
      export const getTabThreeIndicatorValues = (): Promise<TabIndicatorResponse> =>
        Promise.resolve(cloneIndicatorData(TAB_THREE_INDICATOR_DATA))

  - path: apps/www2/registry/default/templates/workbench/service/tab-tables.service.ts
    out: apps/www2/registry/default/templates/workbench/service/tab-tables.service.ts
    lang: ts
    template: |
      import type {
        DrawerFilterCategory,
        DrawerTableItem,
        DrawerTableQuery,
        TabOneTableItem,
        TabThreeTableItem,
        TabTwoTableItem,
        TablePaginationParams,
        WorkbenchTableResponse,
      } from '../types'
      import { paginate } from './pagination'
      
      // TODO: 当前数据集为 MOCK，接入真实接口后改为请求后端并删除本地常量。
      
      const TAB_ONE_TABLE_ROWS: TabOneTableItem[] = [
        {
          id: 'T1-001',
          taskName: 'Inbound sorting backlog',
          owner: 'Warehouse A',
          pending: 38,
          updatedAt: '2024-05-12 09:45',
        },
        {
          id: 'T1-002',
          taskName: 'Damaged parcels audit',
          owner: 'Quality Team',
          pending: 12,
          updatedAt: '2024-05-12 09:21',
        },
        {
          id: 'T1-003',
          taskName: 'COD reconciliation',
          owner: 'Finance Hub',
          pending: 6,
          updatedAt: '2024-05-12 08:50',
        },
        {
          id: 'T1-004',
          taskName: 'Return pickup confirmation',
          owner: 'Service Desk',
          pending: 21,
          updatedAt: '2024-05-12 08:32',
        },
        {
          id: 'T1-005',
          taskName: 'Hub inventory audit',
          owner: 'Operations Control',
          pending: 16,
          updatedAt: '2024-05-12 08:05',
        },
        {
          id: 'T1-006',
          taskName: 'Linehaul document review',
          owner: 'Compliance Team',
          pending: 4,
          updatedAt: '2024-05-12 07:56',
        },
        {
          id: 'T1-007',
          taskName: 'Packaging material replenishment',
          owner: 'Procurement',
          pending: 9,
          updatedAt: '2024-05-12 07:34',
        },
        {
          id: 'T1-008',
          taskName: 'Reverse logistics coordination',
          owner: 'Return Ops',
          pending: 11,
          updatedAt: '2024-05-12 07:12',
        },
        {
          id: 'T1-009',
          taskName: 'Same-day delivery tracking',
          owner: 'Dispatch Center',
          pending: 14,
          updatedAt: '2024-05-12 06:58',
        },
        {
          id: 'T1-010',
          taskName: 'Courier onboarding checklist',
          owner: 'HR Shared Services',
          pending: 5,
          updatedAt: '2024-05-12 06:41',
        },
      ]
      
      const TAB_TWO_TABLE_ROWS: TabTwoTableItem[] = [
        {
          id: 'T2-001',
          route: 'RUH → DMM',
          vehicle: 'Van-23',
          departure: '2024-05-12 07:30',
          delayMinutes: 0,
        },
        {
          id: 'T2-002',
          route: 'JED → MCT',
          vehicle: 'Linehaul-12',
          departure: '2024-05-12 06:45',
          delayMinutes: 18,
        },
        {
          id: 'T2-003',
          route: 'JED → RUH',
          vehicle: 'Linehaul-17',
          departure: '2024-05-12 05:15',
          delayMinutes: 9,
        },
        {
          id: 'T2-004',
          route: 'DMM → BAH',
          vehicle: 'Sprinter-04',
          departure: '2024-05-12 04:50',
          delayMinutes: 0,
        },
        {
          id: 'T2-005',
          route: 'RUH → JED',
          vehicle: 'Linehaul-03',
          departure: '2024-05-12 04:20',
          delayMinutes: 6,
        },
        {
          id: 'T2-006',
          route: 'DMM → RUH',
          vehicle: 'Linehaul-27',
          departure: '2024-05-12 03:55',
          delayMinutes: 0,
        },
        {
          id: 'T2-007',
          route: 'MCT → JED',
          vehicle: 'Linehaul-09',
          departure: '2024-05-12 03:20',
          delayMinutes: 15,
        },
        {
          id: 'T2-008',
          route: 'AUH → RUH',
          vehicle: 'AirFreight-02',
          departure: '2024-05-12 02:45',
          delayMinutes: 0,
        },
      ]
      
      const TAB_THREE_TABLE_ROWS: TabThreeTableItem[] = [
        {
          id: 'T3-001',
          alert: 'Pickup SLA nearing breach',
          severity: 'high',
          affectedOrders: 14,
          lastOccurredAt: '2024-05-12 09:12',
        },
        {
          id: 'T3-002',
          alert: 'Customer escalation pending',
          severity: 'medium',
          affectedOrders: 5,
          lastOccurredAt: '2024-05-12 08:58',
        },
        {
          id: 'T3-003',
          alert: 'Warehouse damage follow-up',
          severity: 'low',
          affectedOrders: 3,
          lastOccurredAt: '2024-05-12 08:40',
        },
        {
          id: 'T3-004',
          alert: 'Cash variance investigation',
          severity: 'medium',
          affectedOrders: 2,
          lastOccurredAt: '2024-05-12 08:17',
        },
        {
          id: 'T3-005',
          alert: 'Inbound damage investigation',
          severity: 'high',
          affectedOrders: 7,
          lastOccurredAt: '2024-05-12 07:51',
        },
        {
          id: 'T3-006',
          alert: 'Pickup document missing',
          severity: 'medium',
          affectedOrders: 6,
          lastOccurredAt: '2024-05-12 07:26',
        },
        {
          id: 'T3-007',
          alert: 'Cold-chain temperature alert',
          severity: 'high',
          affectedOrders: 3,
          lastOccurredAt: '2024-05-12 06:59',
        },
        {
          id: 'T3-008',
          alert: 'Locker delivery pending confirmation',
          severity: 'low',
          affectedOrders: 12,
          lastOccurredAt: '2024-05-12 06:32',
        },
      ]
      
      const DRAWER_TABLE_ROWS: DrawerTableItem[] = [
        {
          id: 'order-1001',
          orderId: 'YD2025-001',
          site: '上海宝山分拨中心',
          manager: '王小明',
          phone: '138****2356',
          exception: '快件超 4 小时未反馈',
          updatedAt: '2025-01-14 09:32',
          category: 'site',
        },
        {
          id: 'order-1002',
          orderId: 'YD2025-002',
          site: '广州白云分拨中心',
          manager: '李思思',
          phone: '137****9870',
          exception: '网点确认逾期',
          updatedAt: '2025-01-14 10:08',
          category: 'site',
        },
        {
          id: 'order-1003',
          orderId: 'YD2025-003',
          site: '京津干线',
          manager: '赵强',
          phone: '136****5821',
          exception: '干线司机未反馈',
          updatedAt: '2025-01-14 08:41',
          category: 'route',
        },
        {
          id: 'order-1004',
          orderId: 'YD2025-004',
          site: '深圳龙岗分拨中心',
          manager: '陈悦',
          phone: '135****7765',
          exception: '异常件未处理',
          updatedAt: '2025-01-13 22:16',
          category: 'site',
        },
        {
          id: 'order-1005',
          orderId: 'YD2025-005',
          site: '武汉江夏网点',
          manager: '郭伟',
          phone: '139****6420',
          exception: '上级网点待反馈',
          updatedAt: '2025-01-13 20:05',
          category: 'site',
        },
        {
          id: 'order-1006',
          orderId: 'YD2025-006',
          site: '西安-重庆干线',
          manager: '刘畅',
          phone: '188****2205',
          exception: '线路迟到未反馈',
          updatedAt: '2025-01-13 19:12',
          category: 'route',
        },
        {
          id: 'order-1007',
          orderId: 'YD2025-007',
          site: '成都青白江网点',
          manager: '杨森',
          phone: '156****3319',
          exception: '异常信息缺失',
          updatedAt: '2025-01-13 18:44',
          category: 'site',
        },
        {
          id: 'order-1008',
          orderId: 'YD2025-008',
          site: '杭州余杭分拨中心',
          manager: '周婷',
          phone: '158****6623',
          exception: '已卸未到待反馈',
          updatedAt: '2025-01-13 17:29',
          category: 'site',
        },
      ]
      
      export const getTabOneTableRows = (
        pagination?: TablePaginationParams
      ): Promise<WorkbenchTableResponse<TabOneTableItem>> =>
        Promise.resolve(paginate(TAB_ONE_TABLE_ROWS, pagination))
      
      export const getTabTwoTableRows = (
        pagination?: TablePaginationParams
      ): Promise<WorkbenchTableResponse<TabTwoTableItem>> =>
        Promise.resolve(paginate(TAB_TWO_TABLE_ROWS, pagination))
      
      export const getTabThreeTableRows = (
        pagination?: TablePaginationParams
      ): Promise<WorkbenchTableResponse<TabThreeTableItem>> =>
        Promise.resolve(paginate(TAB_THREE_TABLE_ROWS, pagination))
      
      const filterDrawerRows = (
        rows: DrawerTableItem[],
        {
          keyword = '',
          category = 'all',
        }: { keyword?: string; category?: DrawerFilterCategory }
      ) => {
        const normalizedKeyword = keyword.trim().toLowerCase()
      
        return rows.filter((row) => {
          const matchCategory = category === 'all' ? true : row.category === category
      
          if (!matchCategory) {
            return false
          }
      
          if (!normalizedKeyword) {
            return true
          }
      
          const searchPool = [row.orderId, row.site, row.manager, row.exception]
          return searchPool.some((field) =>
            field.toLowerCase().includes(normalizedKeyword)
          )
        })
      }
      
      export const getDrawerTableRows = (
        params: DrawerTableQuery = {}
      ): Promise<WorkbenchTableResponse<DrawerTableItem>> => {
        const { keyword = '', category = 'all', currentPage, showCount } = params
        const filtered = filterDrawerRows(DRAWER_TABLE_ROWS, { keyword, category })
      
        return Promise.resolve(
          paginate(filtered, {
            currentPage,
            showCount,
          })
        )
      }

  - path: apps/www2/registry/default/templates/workbench/service/tabs-data.service.ts
    out: apps/www2/registry/default/templates/workbench/service/tabs-data.service.ts
    lang: ts
    template: |
      import type { TabsData } from '../types'
      
      // TODO: 与真实接口打通后移除本地 MOCK 数据，改为调用后端服务。
      
      const MOCK_TABS_DATA: TabsData = {
        pendingBtwCount: 3,
      }
      
      export function getTabsData(): Promise<TabsData> {
        return Promise.resolve({ ...MOCK_TABS_DATA })
      }

  - path: apps/www2/registry/default/templates/workbench/service/task-performance.service.ts
    out: apps/www2/registry/default/templates/workbench/service/task-performance.service.ts
    lang: ts
    template: |
      import type { TaskPerformanceInfo } from '../types'
      
      // TODO: Task Performance 相关接口仍为前端模拟，接入真实服务后删掉本地状态机。
      
      const DEFAULT_INFO: TaskPerformanceInfo = {
        performanceStartTime: null,
        performanceFinishTime: null,
      }
      
      let taskPerformanceState: TaskPerformanceInfo = { ...DEFAULT_INFO }
      
      const readState = (): TaskPerformanceInfo => ({ ...taskPerformanceState })
      
      const writeState = (value: TaskPerformanceInfo) => {
        taskPerformanceState = { ...value }
      }
      
      export const getTaskPerformanceInfo = (): Promise<TaskPerformanceInfo> =>
        Promise.resolve(readState())
      
      export const startTaskPerformance = (): Promise<TaskPerformanceInfo> =>
        new Promise((resolve) => {
          setTimeout(() => {
            const nextState: TaskPerformanceInfo = {
              performanceStartTime: new Date().toISOString(),
              performanceFinishTime: null,
            }
      
            writeState(nextState)
            resolve(nextState)
          }, 300)
        })
      
      export const finishTaskPerformance = (): Promise<TaskPerformanceInfo> =>
        new Promise((resolve) => {
          setTimeout(() => {
            const nextState: TaskPerformanceInfo = {
              performanceStartTime: null,
              performanceFinishTime: new Date().toISOString(),
            }
      
            writeState(nextState)
            resolve(nextState)
          }, 300)
        })

  - path: apps/www2/registry/default/templates/workbench/stores/index.store.ts
    out: apps/www2/registry/default/templates/workbench/stores/index.store.ts
    lang: ts
    template: |
      'use client'
      
      import { create } from 'zustand'
      import { immer } from 'zustand/middleware/immer'
      
      import { createTabOneIndicatorsSlice } from './slices/data/tab-indicator-one.slice'
      import { createTabThreeIndicatorsSlice } from './slices/data/tab-indicator-three.slice'
      import { createTabTwoIndicatorsSlice } from './slices/data/tab-indicator-two.slice'
      import { createFinishWorkSlice } from './slices/ui/finish-work.slice'
      import { createWorkbenchLayoutSlice } from './slices/ui/layout.slice'
      import { createWorkbenchRightSlice } from './slices/ui/right-panel.slice'
      import { createStartWorkSlice } from './slices/ui/start-work.slice'
      import { createTabsSlice } from './slices/ui/tabs.slice'
      import type { WorkbenchStore } from './types'
      
      const useWorkbenchStore = create<WorkbenchStore>()(
        immer((...args) => ({
          tabs: createTabsSlice(...args),
          indicatorOne: createTabOneIndicatorsSlice(...args),
          indicatorTwo: createTabTwoIndicatorsSlice(...args),
          indicatorThree: createTabThreeIndicatorsSlice(...args),
          startWorkConfirm: createStartWorkSlice(...args),
          finishWorkConfirm: createFinishWorkSlice(...args),
          layout: createWorkbenchLayoutSlice(...args),
          rightPanel: createWorkbenchRightSlice(...args),
        }))
      )
      
      export { useWorkbenchStore }

  - path: apps/www2/registry/default/templates/workbench/stores/slices/data/tab-indicator-one.slice.ts
    out: apps/www2/registry/default/templates/workbench/stores/slices/data/tab-indicator-one.slice.ts
    lang: ts
    template: |
      import type { TabOneIndicatorParams } from '../../../types'
      import type { StoreCreator } from '../../types'
      
      type IndicatorState = {
        params: TabOneIndicatorParams
        setParams: (params: Partial<TabOneIndicatorParams>) => void
      }
      
      export type TabIndicatorOneSlice = {
        indicatorOne: IndicatorState
      }
      
      type Slice = TabIndicatorOneSlice['indicatorOne']
      
      const initialParams: TabOneIndicatorParams = {
        paramOne: '',
        paramTwo: '',
        paramThree: '',
      }
      
      export const createTabOneIndicatorsSlice: StoreCreator<Slice> = (set) => ({
        params: { ...initialParams },
        setParams: (params) =>
          set((state) => {
            state.indicatorOne.params = { ...state.indicatorOne.params, ...params }
          }),
      })

  - path: apps/www2/registry/default/templates/workbench/stores/slices/data/tab-indicator-three.slice.ts
    out: apps/www2/registry/default/templates/workbench/stores/slices/data/tab-indicator-three.slice.ts
    lang: ts
    template: |
      import type { TabThreeIndicatorParams } from '../../../types'
      import type { StoreCreator } from '../../types'
      
      type IndicatorState = {
        params: TabThreeIndicatorParams
        setParams: (params: Partial<TabThreeIndicatorParams>) => void
      }
      
      export type TabIndicatorThreeSlice = {
        indicatorThree: IndicatorState
      }
      
      type Slice = TabIndicatorThreeSlice['indicatorThree']
      
      const initialParams: TabThreeIndicatorParams = {
        paramOne: '',
        paramTwo: '',
        paramThree: '',
      }
      
      export const createTabThreeIndicatorsSlice: StoreCreator<Slice> = (set) => ({
        params: { ...initialParams },
        setParams: (params) =>
          set((state) => {
            state.indicatorThree.params = {
              ...state.indicatorThree.params,
              ...params,
            }
          }),
      })

  - path: apps/www2/registry/default/templates/workbench/stores/slices/data/tab-indicator-two.slice.ts
    out: apps/www2/registry/default/templates/workbench/stores/slices/data/tab-indicator-two.slice.ts
    lang: ts
    template: |
      import type { TabTwoIndicatorParams } from '../../../types'
      import type { StoreCreator } from '../../types'
      
      type IndicatorState = {
        params: TabTwoIndicatorParams
        setParams: (params: Partial<TabTwoIndicatorParams>) => void
      }
      
      export type TabIndicatorTwoSlice = {
        indicatorTwo: IndicatorState
      }
      
      type Slice = TabIndicatorTwoSlice['indicatorTwo']
      
      const initialParams: TabTwoIndicatorParams = {
        paramOne: '',
        paramTwo: '',
        paramThree: '',
      }
      
      export const createTabTwoIndicatorsSlice: StoreCreator<Slice> = (set) => ({
        params: { ...initialParams },
        setParams: (params) =>
          set((state) => {
            state.indicatorTwo.params = { ...state.indicatorTwo.params, ...params }
          }),
      })

  - path: apps/www2/registry/default/templates/workbench/stores/slices/ui/finish-work.slice.ts
    out: apps/www2/registry/default/templates/workbench/stores/slices/ui/finish-work.slice.ts
    lang: ts
    template: |
      import type { StoreCreator } from '../../types'
      
      type FinishWorkState = {
        open: boolean
        pendingFinishTime: string | null
        setOpen: (value: boolean) => void
        openDialog: () => void
        closeDialog: () => void
      }
      
      export type FinishWorkSlice = {
        finishWorkConfirm: FinishWorkState
      }
      
      type Slice = FinishWorkSlice['finishWorkConfirm']
      
      const initialState: Pick<Slice, 'open' | 'pendingFinishTime'> = {
        open: false,
        pendingFinishTime: null,
      }
      
      export const createFinishWorkSlice: StoreCreator<Slice> = (set) => ({
        ...initialState,
        setOpen: (value) => {
          set((state) => {
            state.finishWorkConfirm.open = value
            if (!value) {
              state.finishWorkConfirm.pendingFinishTime = null
            }
          })
        },
        openDialog: () => {
          set((state) => {
            state.finishWorkConfirm.open = true
            state.finishWorkConfirm.pendingFinishTime = new Date().toISOString()
          })
        },
        closeDialog: () => {
          set((state) => {
            state.finishWorkConfirm.open = false
            state.finishWorkConfirm.pendingFinishTime = null
          })
        },
      })

  - path: apps/www2/registry/default/templates/workbench/stores/slices/ui/layout.slice.ts
    out: apps/www2/registry/default/templates/workbench/stores/slices/ui/layout.slice.ts
    lang: ts
    template: |
      'use client'
      
      import type { StoreCreator } from '../../types'
      
      type WorkbenchLayoutState = {
        collapsed?: boolean
        setCollapsed: (value: boolean) => void
      }
      
      export type WorkbenchLayoutSlice = {
        layout: WorkbenchLayoutState
      }
      
      type Slice = WorkbenchLayoutSlice['layout']
      
      const getInitialCollapsed = () => {
        if (typeof window === 'undefined') {
          return false
        }
        return window.innerWidth < 1366
      }
      
      const initialState: Pick<Slice, 'collapsed'> = {
        collapsed: getInitialCollapsed(),
      }
      
      export const createWorkbenchLayoutSlice: StoreCreator<Slice> = (set) => ({
        ...initialState,
        setCollapsed: (value) => {
          set((state) => {
            state.layout.collapsed = value
          })
        },
      })

  - path: apps/www2/registry/default/templates/workbench/stores/slices/ui/right-panel.slice.ts
    out: apps/www2/registry/default/templates/workbench/stores/slices/ui/right-panel.slice.ts
    lang: ts
    template: |
      import {
        WORKBENCH_RIGHT_DEFAULT_STATUS,
        type WorkbenchRightContentStatus,
      } from '../../../types'
      import type { StoreCreator } from '../../types'
      
      type WorkbenchRightPanelState = {
        contentStatus: WorkbenchRightContentStatus
        internalStatus: WorkbenchRightContentStatus
        controlled: boolean
        setContentStatus: (status: WorkbenchRightContentStatus) => void
        setControlMode: (controlled: boolean) => void
        syncControlledStatus: (status: WorkbenchRightContentStatus) => void
        reset: () => void
      }
      
      export type WorkbenchRightSlice = {
        rightPanel: WorkbenchRightPanelState
      }
      
      type Slice = WorkbenchRightSlice['rightPanel']
      
      export const createWorkbenchRightSlice: StoreCreator<Slice> = (set) => ({
        contentStatus: WORKBENCH_RIGHT_DEFAULT_STATUS,
        internalStatus: WORKBENCH_RIGHT_DEFAULT_STATUS,
        controlled: false,
        setContentStatus: (status) => {
          set((state) => {
            if (state.rightPanel.controlled) {
              return
            }
            state.rightPanel.internalStatus = status
            state.rightPanel.contentStatus = status
          })
        },
        setControlMode: (controlled) => {
          set((state) => {
            if (state.rightPanel.controlled === controlled) {
              return
            }
            state.rightPanel.controlled = controlled
            if (!controlled) {
              state.rightPanel.contentStatus = state.rightPanel.internalStatus
            }
          })
        },
        syncControlledStatus: (status) => {
          set((state) => {
            state.rightPanel.contentStatus = status
          })
        },
        reset: () => {
          set((state) => {
            state.rightPanel.contentStatus = WORKBENCH_RIGHT_DEFAULT_STATUS
            state.rightPanel.internalStatus = WORKBENCH_RIGHT_DEFAULT_STATUS
            state.rightPanel.controlled = false
          })
        },
      })

  - path: apps/www2/registry/default/templates/workbench/stores/slices/ui/start-work.slice.ts
    out: apps/www2/registry/default/templates/workbench/stores/slices/ui/start-work.slice.ts
    lang: ts
    template: |
      import type { StoreCreator } from '../../types'
      
      type StartWorkState = {
        open: boolean
        setOpen: (value: boolean) => void
        openDialog: () => void
        closeDialog: () => void
      }
      
      export type StartWorkSlice = {
        startWorkConfirm: StartWorkState
      }
      
      type Slice = StartWorkSlice['startWorkConfirm']
      
      const initialState: Pick<Slice, 'open'> = {
        open: false,
      }
      
      export const createStartWorkSlice: StoreCreator<Slice> = (set) => ({
        ...initialState,
        setOpen: (value) => {
          set((state) => {
            state.startWorkConfirm.open = value
          })
        },
        openDialog: () => {
          set((state) => {
            state.startWorkConfirm.open = true
          })
        },
        closeDialog: () => {
          set((state) => {
            state.startWorkConfirm.open = false
          })
        },
      })

  - path: apps/www2/registry/default/templates/workbench/stores/slices/ui/tabs.slice.ts
    out: apps/www2/registry/default/templates/workbench/stores/slices/ui/tabs.slice.ts
    lang: ts
    template: |
      import type { TabValue } from '../../../types'
      import type { StoreCreator } from '../../types'
      
      type TabsState = {
        activeTab: TabValue
        setActiveTab: (value: TabValue) => void
      }
      
      export type TabsSlice = {
        tabs: TabsState
      }
      
      type Slice = TabsSlice['tabs']
      
      const initialState: Pick<Slice, 'activeTab'> = {
        activeTab: '1',
      }
      
      export const createTabsSlice: StoreCreator<Slice> = (set) => ({
        ...initialState,
        setActiveTab: (value) => {
          set((state) => {
            state.tabs.activeTab = value
          })
        },
      })

  - path: apps/www2/registry/default/templates/workbench/stores/types.ts
    out: apps/www2/registry/default/templates/workbench/stores/types.ts
    lang: ts
    template: |
      import type { StateCreator } from 'zustand'
      
      import type { TabIndicatorOneSlice } from './slices/data/tab-indicator-one.slice'
      import { TabIndicatorThreeSlice } from './slices/data/tab-indicator-three.slice'
      import { TabIndicatorTwoSlice } from './slices/data/tab-indicator-two.slice'
      import type { FinishWorkSlice } from './slices/ui/finish-work.slice'
      import type { WorkbenchLayoutSlice } from './slices/ui/layout.slice'
      import type { WorkbenchRightSlice } from './slices/ui/right-panel.slice'
      import type { StartWorkSlice } from './slices/ui/start-work.slice'
      import type { TabsSlice } from './slices/ui/tabs.slice'
      
      export type WorkbenchStore = TabsSlice &
        TabIndicatorOneSlice &
        TabIndicatorTwoSlice &
        TabIndicatorThreeSlice &
        StartWorkSlice &
        FinishWorkSlice &
        WorkbenchLayoutSlice &
        WorkbenchRightSlice
      
      export type StoreCreator<TSlice> = StateCreator<
        WorkbenchStore,
        [['zustand/immer', never], never],
        [],
        TSlice
      >

  - path: apps/www2/registry/default/templates/workbench/types/index.ts
    out: apps/www2/registry/default/templates/workbench/types/index.ts
    lang: ts
    template: |
      export type TabId = 'tabOne' | 'tabTwo' | 'tabThree'
      
      export type TabValue = '1' | '2' | '3'
      
      export interface TabOneIndicatorParams {
        paramOne: string
        paramTwo: string
        paramThree: string
      }
      export interface TabTwoIndicatorParams {
        paramOne: string
        paramTwo: string
        paramThree: string
      }
      export interface TabThreeIndicatorParams {
        paramOne: string
        paramTwo: string
        paramThree: string
      }
      
      export interface TablePaginationParams {
        currentPage?: number
        showCount?: number
      }
      
      export interface TablePagination {
        currentPage: number
        showCount: number
        totalResult: number
        totalPage: number
      }
      
      export interface WorkbenchTableResponse<T> {
        results: T[]
        pagination: TablePagination
      }
      
      export type DrawerFilterCategory = 'all' | 'site' | 'route'
      
      export interface DrawerTableItem {
        id: string
        orderId: string
        site: string
        manager: string
        phone: string
        exception: string
        updatedAt: string
        category: DrawerFilterCategory
      }
      
      export interface DrawerTableQuery extends TablePaginationParams {
        keyword?: string
        category?: DrawerFilterCategory
      }
      
      export interface TabOneTableItem {
        id: string
        taskName: string
        owner: string
        pending: number
        updatedAt: string
      }
      
      export interface TabTwoTableItem {
        id: string
        route: string
        vehicle: string
        departure: string
        delayMinutes: number
      }
      
      export interface TabThreeTableItem {
        id: string
        alert: string
        severity: 'low' | 'medium' | 'high'
        affectedOrders: number
        lastOccurredAt: string
      }
      
      export interface TabIndicatorSnapshot {
        value: number
        children: Record<string, number>
      }
      
      export type TabIndicatorResponse = Record<string, TabIndicatorSnapshot>
      
      export interface WorkbenchMetrics {
        kpiPercent: number
        task1: number
        task2: number
        task3: number
        task4: number
        task5: number
        pendingTask1: number
        pendingTask2: number
        pendingTask3: number
      }
      
      export interface TabsData {
        pendingBtwCount: number
      }
      
      export interface TaskPerformanceInfo {
        performanceStartTime: string | null
        performanceFinishTime: string | null
      }
      
      export type WorkbenchRightContentStatus = 'normal' | 'warning' | 'error'
      
      export const WORKBENCH_RIGHT_DEFAULT_STATUS: WorkbenchRightContentStatus =
        'normal'

  - path: apps/www2/registry/default/templates/workbench/utils/index.ts
    out: apps/www2/registry/default/templates/workbench/utils/index.ts
    lang: ts
    template: |
      /**
       * 检查对象是否存在至少一个属性值大于0
       * @param obj 待检查的对象（属性值为数字类型）
       * @returns 存在任意属性值>0返回true，否则返回false
       */
      export const hasAnyValueGreaterThanZero = (
        obj: Record<string, number>
      ): boolean => {
        // 获取对象所有值组成数组，检查是否有任意值>0
        return Object.values(obj).some((value) => value > 0)
      }
      
      export type WorkbenchKpiStatus = 'normal' | 'warning' | 'error'
      
      /**
       * 根据 KPI 百分比返回对应内容区状态
       * - >=90: normal
       * - >=70 且 <90: warning
       * - <70 或非法值: error
       */
      export const getWorkbenchKpiStatus = (
        kpiPercent: number | null | undefined
      ): WorkbenchKpiStatus => {
        if (!Number.isFinite(kpiPercent)) {
          return 'error'
        }
      
        if (kpiPercent && kpiPercent >= 90) {
          return 'normal'
        }
      
        if (kpiPercent && kpiPercent >= 70) {
          return 'warning'
        }
      
        return 'error'
      }
