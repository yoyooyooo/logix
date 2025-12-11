export interface Draft {
    title: string;
    path: string;
    level: string;
    status: string;
    value: string;
    priority: number | string;
    rank?: number;
    filename: string;
    related?: string[];
}

export interface Column {
    id: string;
    title: string;
}
