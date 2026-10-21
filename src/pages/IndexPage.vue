<!-- src/pages/IndexPage.vue -->
<template>
  <q-page padding>
    <div class="row justify-center q-mt-xl">
      <div class="col-12 col-md-6">
        <q-file
          v-model="excelFile"
          label="Cargar Excel"
          accept=".xlsx, .xls"
          outlined
          clearable
        />

        <q-btn
          class="q-mt-md full-width"
          color="primary"
          label="Generar Telegramas"
          :disable="!excelFile"
          @click="processFile"
        />

        <q-card flat bordered class="q-mt-xl bg-white">
          <q-card-section>
            <div class="text-h6 text-grey-8 row items-center">
              <q-icon name="info" size="sm" class="q-mr-sm text-primary" />
              Guía de Procesamiento
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="text-body2 text-grey-8">
            <p class="q-mb-xs"><strong>Input:</strong></p>
            <ul class="q-mt-none q-mb-md">
              <li>Archivo Excel (.xlsx o .xls).</li>
              <li>Columnas obligatorias: <strong>SAP Product Code</strong>, <strong>Property</strong>, <strong>Value</strong> y <strong>Value Description</strong>.</li>
            </ul>

            <p class="q-mb-xs"><strong>Output:</strong></p>
            <ul class="q-mt-none q-mb-none">
              <li>Paquete <strong>.zip</strong> con telegramas XML individuales listos para ingesta.</li>
            </ul>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
// src/pages/IndexPage.vue
import { ref } from 'vue';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { FAMILY_PROPERTIES, XML_HEADERS, PROPERTY_DESCRIPTIONS } from '../utils/constans';

const excelFile = ref(null);

const processFile = async () => {
  if (!excelFile.value) return;

  const reader = new FileReader();

  reader.onload = async (e) => {
    // Lectura del documento Excel
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rawData = XLSX.utils.sheet_to_json(worksheet);

    // Limpieza de espacios y agrupación por SAP Product Code
    const groupedData = {};
    rawData.forEach(row => {
      const rawCode = row['SAP Product Code'];
      if (!rawCode) return;

      const cleanCode = rawCode.toString().trim();
      if (!groupedData[cleanCode]) {
        groupedData[cleanCode] = [];
      }
      groupedData[cleanCode].push(row);
    });

    const zip = new JSZip();

    // Procesamiento y construcción XML por producto
    for (const [sapCode, rows] of Object.entries(groupedData)) {
      const flyRow = rows.find(r => r['Property'] === 'FLY');
      if (!flyRow) continue;

      const flyValue = flyRow['Value'];
      const allowedProps = FAMILY_PROPERTIES[flyValue];
      if (!allowedProps) continue;

      const filteredRows = rows.filter(r => allowedProps.includes(r['Property']));

      let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xmlString += `<TIANUMBER_REQ_RCV xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="">\n`;
      xmlString += `  <HEADER>\n`;
      xmlString += `    <TLGNAME>TIANUMBER_REQ_RCV</TLGNAME>\n`;
      xmlString += `    <SENDER>SAP</SENDER>\n`;
      xmlString += `    <RECEIVER>MES</RECEIVER>\n`;
      xmlString += `  </HEADER>\n`;
      xmlString += `  <REF_DOC_NUMBER>${XML_HEADERS.REF_DOC_NUMBER}</REF_DOC_NUMBER>\n`;
      xmlString += `  <ACTION>${XML_HEADERS.ACTION}</ACTION>\n`;
      xmlString += `  <REQUEST_TYPE>${XML_HEADERS.REQUEST_TYPE}</REQUEST_TYPE>\n`;
      xmlString += `  <PLANT_ID>${XML_HEADERS.PLANT_ID}</PLANT_ID>\n`;
      xmlString += `  <SAP_PRODUCT_CODE>${sapCode}</SAP_PRODUCT_CODE>\n`;

      filteredRows.forEach(row => {
        const value = row['Value'] !== undefined ? row['Value'] : '';
        const valueDesc = row['Value Description'] !== undefined ? row['Value Description'] : '';
        const propName = row['Property'];

        const propertyDesc = PROPERTY_DESCRIPTIONS[propName] || 'DEFAULT';

        xmlString += `  <PRODUCT_ATTRIBUTES>\n`;
        xmlString += `    <PROPERTY>${propName}</PROPERTY>\n`;
        xmlString += `    <PROPERTYDESCRIPTION>${propertyDesc}</PROPERTYDESCRIPTION>\n`;
        xmlString += `    <VALUE>${value}</VALUE>\n`;
        xmlString += `    <VALUEDESCRIPTION>${valueDesc}</VALUEDESCRIPTION>\n`;
        xmlString += `  </PRODUCT_ATTRIBUTES>\n`;
      });

      xmlString += `</TIANUMBER_REQ_RCV>`;

      zip.file(`${sapCode}.xml`, xmlString);
    }

    // Empaquetado final y descarga
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(zipBlob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'telegramas_tias.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  reader.readAsArrayBuffer(excelFile.value);
};
</script>
