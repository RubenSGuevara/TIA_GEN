// src/utils/constants.js
export const FAMILY_PROPERTIES = {
  TX: [
    'PCK_MV', 'CRQ', 'FOR', 'PRO', 'ENP', 'DM', 'WE', 'WT', 'ISP', 'OSP', 'FLY', 'DM_IN', 'LHF', 'LHT',
    'WT_IN', 'EST', 'GRD', 'NOR', 'RLH', 'TTR', 'LHF_FT', 'LHT_FT', 'TQ_NUMBER', 'TQ_ITEM', 'TQ_VERSION',
    'QCP_NUMBER', 'QCP_REVISION'
  ],
  CN: [
    'PCK_MV', 'CRQ', 'FOR', 'PRO', 'DM', 'WE', 'WT', 'ISP', 'OSP', 'EPB', 'EPP', 'FLY', 'DM_IN', 'LHF',
    'LHT', 'WT_IN', 'EST', 'GRD', 'NOR', 'RLH', 'TTR', 'TYP', 'LHF_FT', 'LHT_FT', 'ETC', 'FTC', 'SDL',
    'SDL_IN', 'SDD', 'SDD_IN', 'DYT', 'TQ_NUMBER', 'TQ_ITEM', 'TQ_VERSION', 'QCP_NUMBER', 'QCP_REVISION'
  ],
  LP: [
    'PCK_MV', 'CRQ', 'FOR', 'PRO', 'ENP', 'DM', 'WE', 'WT', 'ISP', 'OSP', 'FLY', 'DM_IN', 'LHF', 'LHT',
    'WT_IN', 'EST', 'GRD', 'NOR', 'RLH', 'LHF_FT', 'LHT_FT', 'TQ_NUMBER', 'TQ_ITEM', 'TQ_VERSION',
    'QCP_NUMBER', 'QCP_REVISION'
  ]
};

export const PROPERTY_DESCRIPTIONS = {
  PCK_MV: 'Packing-mv',
  CRQ: 'Customer requirement',
  FOR: 'Forming',
  PRO: 'Process',
  DM: 'Outside diameter in mm',
  WE: 'Weight in ppf',
  WT: 'Wall thickness in mm',
  ISP: 'Inside surface protection',
  OSP: 'Outside surface protection',
  EPB: 'Protector for box end',
  EPP: 'Protector for pin end',
  FLY: 'Family',
  DM_IN: 'Outside diameter in inches',
  LHF: 'Length from in mm',
  LHT: 'Length to in mm',
  WT_IN: 'Wall thickness in inches',
  EST: 'Ends',
  GRD: 'Steel grade',
  NOR: 'International norm',
  RLH: 'Length',
  TTR: 'Heat treatment',
  TYP: 'Type',
  LHF_FT: 'Length from in ft',
  LHT_FT: 'Length to in ft',
  ETC: 'Engaged thread compound',
  FTC: 'Field thread compound',
  SDL: 'Drift length mm',
  SDL_IN: 'Drift length in',
  SDD: 'Drift diameter mm',
  SDD_IN: 'Drift diameter in',
  DYT: 'Drift Type',
  AGR: 'SR Group',
  HLT: 'Heat/Lot Traceability',
  TQ_NUMBER: 'TQ_NUMBER',
  TQ_ITEM: 'TQ_ITEM',
  TQ_VERSION: 'TQ_VERSION',
  QCP_NUMBER: 'QCP_NUMBER',
  QCP_REVISION: 'QCP_REVISION'
};

export const XML_HEADERS = {
  REF_DOC_NUMBER: '0000000000',
  ACTION: 'CR',
  REQUEST_TYPE: 'S',
  PLANT_ID: 'HI10'
};
