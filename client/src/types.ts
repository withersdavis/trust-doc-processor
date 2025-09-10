export interface Citation {
    text?: string;
    full_text?: string;
    class?: string;
    citation_key?: string;
    location?: {
        start: number;
        end: number;
        length?: number;
    };
    confidence?: number;
    attributes?: any;
}

export interface ProcessingResult {
    success: boolean;
    filename: string;
    result?: {
        metadata: {
            processed_date: string;
            original_filename: string;
            processing_time_ms: number;
        };
        extraction: {
            Basic_Information?: Record<string, any>;
            Summary?: Record<string, any>;
            Details?: Record<string, any>;
            // Legacy support
            KEY_FIELDS?: Record<string, any>;
            SUMMARY_PARAGRAPHS?: Record<string, any>;
            DETAILS?: Record<string, any>;
            // Allow string indexing
            [key: string]: Record<string, any> | undefined;
        };
        citations: Citation[];
    };
    // Legacy support for direct access
    extraction?: {
        Basic_Information?: Record<string, any>;
        Summary?: Record<string, any>;
        Details?: Record<string, any>;
        // Allow string indexing
        [key: string]: Record<string, any> | undefined;
    };
    citations?: Citation[];
    // Legacy template support
    Basic_Information?: Record<string, any>;
    Summary?: Record<string, any>;
    Details?: Record<string, any>;
    KEY_FIELDS?: Record<string, any>;
    SUMMARY_PARAGRAPHS?: Record<string, any>;
    DETAILS?: Record<string, any>;
    // Allow string indexing for legacy support
    [key: string]: any;
}