// src/lib/universities/registry.ts
import type { UniConfig } from './types';

export const uniRegistry: Record<string, UniConfig> = {
 MOUAU: {
  acronym: 'MOUAU',
  receipt: {
    actionName:       'fetchReceipt',
    refLabel:         'receipt ref number',
    refPlaceholder:   'e.g. 181387930941',
    refFieldName:     'ref',
    refExtractParam:  'transaction_ref',
    matricLabel:      'Matric number',
    matricPlaceholder:'e.g. MOUAU/PHY/25/123456',
    badgeLabel:       'MOUAU Auto-fill',
    fields: [
      { key: 'name',       label: 'Name' },
      { key: 'college',    label: 'College' },
      { key: 'department', label: 'Department' },
      { key: 'matricNo',   label: 'Matric No' },
      { key: 'jambregNo',  label: 'JAMB Reg No', mask: true, maskStart: 4, maskEnd: 3 },
      { key: 'receiptNo',  label: 'Receipt No',  mask: true, maskStart: 2, maskEnd: 2 },
    ]
  }
},

 ABSU: {
  acronym: 'ABSU',
  receipt: {
    actionName:        'fetchAbsuReceipt',
    refLabel:          'Receipt number',
    refPlaceholder:    '1741234',
    refFieldName:      'pmid',
    refExtractParam:   'pmid',
    matricLabel:       'Matric number',
    matricPlaceholder: 'e.g. 2025/123456/REGULAR',
    badgeLabel:        'ABSU Auto-fill',
    fields: [
      { key: 'name',       label: 'Name' },
      { key: 'faculty',    label: 'Faculty' },
      { key: 'department', label: 'Department' },
      { key: 'matricNo',   label: 'Matric No' },
      { key: 'receiptNo',  label: 'Receipt No', mask: true, maskStart: 3, maskEnd: 4 },
    ]
  }
},

  // Add more universities here — zero changes needed anywhere else
  ESUT: {
  acronym: 'ESUT',
  receipt: {
    actionName:        'fetchEsutReceipt',
    refLabel:          'Matric number',
    refPlaceholder:    'e.g. 2025030223877',
    refFieldName:      'id',
    refExtractParam:   'validate',  // full URL: esutid.com/validate/2025030223877
    matricLabel:       'Matric number',
    matricPlaceholder: 'e.g. 2025030223877',
    badgeLabel:        'ESUT Auto-fill',
    fields: [
      { key: 'name',       label: 'Name' },
      { key: 'faculty',    label: 'Faculty' },
      { key: 'department', label: 'Department' },
      { key: 'matricNo',   label: 'Matric No' },
      { key: 'receiptNo',  label: 'Receipt No', mask: true, maskStart: 7, maskEnd: 4 },
    ]
  }
},

   // Add more universities here — zero changes needed anywhere else
  ABIAPOLY: {
    acronym: 'ABIAPOLY',
    // no receipt config = no auto-fill section shown
  }
};

export function getUniConfig(acronym: string): UniConfig | null {
  return uniRegistry[acronym] ?? null;
}