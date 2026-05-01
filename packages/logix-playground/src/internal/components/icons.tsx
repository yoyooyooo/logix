import React from 'react'

type IconProps = React.SVGProps<SVGSVGElement>

const iconProps = (className?: string): IconProps => ({
  className,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
})

export const PlayIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)} fill="currentColor" stroke="currentColor">
    <path d="M6 4l14 8-14 8z" />
  </svg>
)

export const CheckCircleIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9" />
  </svg>
)

export const BeakerIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M9 3h6" />
    <path d="M10 3v5l-4.5 8A3.5 3.5 0 0 0 8.6 21h6.8a3.5 3.5 0 0 0 3.1-5L14 8V3" />
    <path d="M8 15h8" />
  </svg>
)

export const RotateCcwIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v6h6" />
  </svg>
)

export const GitBranchIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <circle cx="6" cy="4" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="6" cy="20" r="2" />
    <path d="M6 6v12" />
    <path d="M8 12h6a4 4 0 0 0 4-4" />
  </svg>
)

export const CircleIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <circle cx="12" cy="12" r="9" />
  </svg>
)

export const ChevronDownIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const ChevronRightIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
)

export const FolderIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
)

export const FolderOpenIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M3 7h6l2 2h10" />
    <path d="M3 18l2-7h18l-2 7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
)

export const FileJsonIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M10 12l-2 2 2 2" />
    <path d="M14 12l2 2-2 2" />
  </svg>
)

export const FilePlusIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M12 12v6" />
    <path d="M9 15h6" />
  </svg>
)

export const FolderPlusIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M12 11v6" />
    <path d="M9 14h6" />
  </svg>
)

export const RefreshCwIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M21 12a9 9 0 0 1-15 6.7" />
    <path d="M3 12a9 9 0 0 1 15-6.7" />
    <path d="M18 3v5h-5" />
    <path d="M6 21v-5h5" />
  </svg>
)

export const GripVerticalIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const FormatIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M4 6h16" />
    <path d="M4 12h10" />
    <path d="M4 18h7" />
    <path d="M17 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
  </svg>
)

export const GripHorizontalIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <circle cx="6" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="18" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="6" cy="15" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    <circle cx="18" cy="15" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const XIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
)

export const TrashIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v5" />
    <path d="M14 11v5" />
  </svg>
)

export const SearchIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
)

export const PackageIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z" />
    <path d="M12 11l8-4.5" />
    <path d="M12 11v9" />
    <path d="M12 11L4 6.5" />
  </svg>
)

export const ChevronsLeftRightIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M8 7l-5 5 5 5" />
    <path d="M16 7l5 5-5 5" />
  </svg>
)

export const ChevronsUpDownIcon = ({ className }: IconProps): React.ReactElement => (
  <svg {...iconProps(className)}>
    <path d="M7 8l5-5 5 5" />
    <path d="M7 16l5 5 5-5" />
  </svg>
)
