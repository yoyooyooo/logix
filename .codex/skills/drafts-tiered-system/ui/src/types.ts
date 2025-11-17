export interface Draft {
    id?: string;
    title: string;
    path: string;
    level: string;
    status: string;
    value: string;
    priority: number | string;
    rank?: number;
    filename: string;
    depends_on?: string[];
    related?: string[];
}

export interface Column {
    id: string;
    title: string;
}
