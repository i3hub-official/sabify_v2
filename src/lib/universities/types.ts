export interface ReceiptField {
  key: string;        // internal key used in form prefill
  label: string;      // display label in preview card
  mask?: boolean;     // mask in preview?
  maskStart?: number; // chars to show at start
  maskEnd?: number;   // chars to show at end
}

// src/lib/universities/types.ts
export interface UniReceiptConfig {
  actionName:       string;
  refLabel:         string;
  refPlaceholder:   string;
  refFieldName?:    string;   // FormData key sent to the action, defaults to 'ref'
  refExtractParam?: string;
  matricLabel?:     string;
  matricPlaceholder?: string;
  badgeLabel:       string;
  fields:           ReceiptField[];
}

export interface UniConfig {
  acronym: string;
  receipt?: UniReceiptConfig;  // undefined = no auto-fill for this uni
}