import type { ReactConfigSnapshot } from './config.js'

export type ControlplaneKernelConfigConfirmCause =
  | 'boot-confirm'
  | 'ready-confirm'
  | 'config-boot-owner-lock'
  | 'neutral-settled-refresh-allowed'

export type ControlplaneKernelConfigConfirmDecision =
  | {
      readonly action: 'run'
      readonly reason: ControlplaneKernelConfigConfirmCause
      readonly ticket: number
    }
  | {
      readonly action: 'skip'
      readonly reason: 'config-fingerprint-unchanged'
    }

export type ControlplaneKernelTicketCommitDecision =
  | {
      readonly accepted: true
      readonly reason: 'ticket-committed'
    }
  | {
      readonly accepted: false
      readonly reason: 'ticket-expired'
    }

type OwnerKernelState = {
  neutralSettled: boolean
  // Monotonic ticket counter per ownerKey, used to guard async confirms.
  ticketSeq: number
  activeTicket: number | null
  lastCommittedFingerprint: string | null
}

const getOwnerKernelState = (map: Map<string, OwnerKernelState>, ownerKey: string): OwnerKernelState => {
  const existing = map.get(ownerKey)
  if (existing) return existing
  const created: OwnerKernelState = {
    neutralSettled: false,
    ticketSeq: 0,
    activeTicket: null,
    lastCommittedFingerprint: null,
  }
  map.set(ownerKey, created)
  return created
}

export const fingerprintReactConfigSnapshot = (snapshot: ReactConfigSnapshot): string => {
  return [
    snapshot.gcTime,
    snapshot.initTimeoutMs,
    snapshot.lowPriorityDelayMs,
    snapshot.lowPriorityMaxDelayMs,
    snapshot.source,
  ].join('|')
}

export class ControlplaneKernel {
  private readonly ownerState = new Map<string, OwnerKernelState>()

  static make(): ControlplaneKernel {
    return new ControlplaneKernel()
  }

  onNeutralSettled(ownerKey: string): void {
    const state = getOwnerKernelState(this.ownerState, ownerKey)
    state.neutralSettled = true
  }

  recordCommittedFingerprint(ownerKey: string, fingerprint: string): void {
    const state = getOwnerKernelState(this.ownerState, ownerKey)
    state.lastCommittedFingerprint = fingerprint
  }

  requestConfigConfirm(input: {
    readonly ownerKey: string
    readonly cause: ControlplaneKernelConfigConfirmCause
    readonly currentFingerprint: string | null
  }): ControlplaneKernelConfigConfirmDecision {
    const state = getOwnerKernelState(this.ownerState, input.ownerKey)

    // Kernel v1: owner ticket policy applies to every config confirm trigger.
    // G5 compatibility rule is preserved for neutral-settled ready refresh.
    if (
      input.cause === 'neutral-settled-refresh-allowed' &&
      state.neutralSettled &&
      state.lastCommittedFingerprint !== null &&
      input.currentFingerprint !== null &&
      state.lastCommittedFingerprint === input.currentFingerprint
    ) {
      return {
        action: 'skip',
        reason: 'config-fingerprint-unchanged',
      }
    }

    const ticket = ++state.ticketSeq
    state.activeTicket = ticket
    return {
      action: 'run',
      reason: input.cause,
      ticket,
    }
  }

  decideConfigReadyConfirmRequested(input: {
    readonly ownerKey: string
    readonly currentFingerprint: string | null
  }): ControlplaneKernelConfigConfirmDecision {
    return this.requestConfigConfirm({
      ownerKey: input.ownerKey,
      cause: 'neutral-settled-refresh-allowed',
      currentFingerprint: input.currentFingerprint,
    })
  }

  isTicketCurrent(ownerKey: string, ticket: number): boolean {
    const state = getOwnerKernelState(this.ownerState, ownerKey)
    return state.activeTicket === ticket
  }

  commitTicket(ownerKey: string, ticket: number, fingerprint: string): ControlplaneKernelTicketCommitDecision {
    const state = getOwnerKernelState(this.ownerState, ownerKey)
    if (state.activeTicket !== ticket) {
      return {
        accepted: false,
        reason: 'ticket-expired',
      }
    }
    state.activeTicket = null
    state.lastCommittedFingerprint = fingerprint
    return {
      accepted: true,
      reason: 'ticket-committed',
    }
  }
}
