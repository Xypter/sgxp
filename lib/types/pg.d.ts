declare module 'pg' {
    export class Pool {
        constructor(config?: any);
        connect(): Promise<any>;
        query(text: string, params?: any[]): Promise<any>;
    }
} 