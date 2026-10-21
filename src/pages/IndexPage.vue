<!-- src/pages/IndexPage.vue -->
<template>
  <q-page padding>
    <div class="row justify-center q-mt-xl">
      <div class="col-12 col-md-6">
        <q-file v-model="excelFile" label="Cargar Excel" accept=".xlsx, .xls" outlined clearable />

        <div class="row justify-between q-mb-sm">
          <div class="text-subtitle2 text-grey-8">Carga de datos</div>
          <q-btn
            flat
            color="primary"
            icon="download"
            label="Descargar plantilla de ejemplo"
            size="sm"
            class="q-px-sm"
            @click="downloadTemplate"
          />
        </div>

        <q-btn
          class="q-mt-md full-width text-weight-bold"
          color="primary"
          label="Generar Telegramas"
          icon="settings_applications"
          :disable="!excelFile"
          :loading="isProcessing"
          @click="processFile"
        />

        <q-banner
          v-if="generatedCount !== null"
          class="bg-green-1 text-green-10 q-mt-md rounded-borders border-green"
          dense
          rounded
        >
          <template v-slot:avatar>
            <q-icon name="task_alt" color="green-8" />
          </template>
          Se empaquetaron <strong>{{ generatedCount }}</strong> TIAs en el archivo ZIP correctamente.
        </q-banner>

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
              <li>
                Columnas obligatorias: <strong>SAP Product Code</strong>, <strong>Property</strong>,
                <strong>Value</strong> y <strong>Value Description</strong>.
              </li>
              <li>
                Puedes descargar una plantilla en la opción
                <strong>"DESCARGAR PLANTILLA DE EJEMPLO".</strong>
              </li>
            </ul>

            <p class="q-mb-xs"><strong>Output:</strong></p>
            <ul class="q-mt-none q-mb-none">
              <li>
                Paquete <strong>.zip</strong> con telegramas XML individuales listos para ingesta.
              </li>
            </ul>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
// src/pages/IndexPage.vue
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import {
  FAMILY_PROPERTIES,
  XML_HEADERS,
  PROPERTY_DESCRIPTIONS,
  NUMERIC_PROPERTIES,
} from '../utils/constans'

const $q = useQuasar()
const excelFile = ref(null)
const isProcessing = ref(false)
const generatedCount = ref(null)

const processFile = async () => {
  if (!excelFile.value) return

  isProcessing.value = true
  generatedCount.value = null

  const reader = new FileReader()

  reader.onload = async (e) => {
    try {
      // Lectura del documento Excel
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      const rawData = XLSX.utils.sheet_to_json(worksheet)

      // Limpieza de espacios y agrupación por SAP Product Code
      const groupedData = {}
      rawData.forEach((row) => {
        const rawCode = row['SAP Product Code']
        if (!rawCode) return

        const cleanCode = rawCode.toString().trim()
        if (!groupedData[cleanCode]) {
          groupedData[cleanCode] = []
        }
        groupedData[cleanCode].push(row)
      })

      const zip = new JSZip()
      let count = 0

      // Procesamiento y construcción XML por producto
      for (const [sapCode, rows] of Object.entries(groupedData)) {
        const flyRow = rows.find((r) => r['Property'] === 'FLY')
        if (!flyRow) continue

        const flyValue = flyRow['Value']
        const allowedProps = FAMILY_PROPERTIES[flyValue]
        if (!allowedProps) continue

        const filteredRows = rows.filter((r) => allowedProps.includes(r['Property']))
        const normalizedRows = normalizeNumbers(filteredRows)

        let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n`
        xmlString += `<TIANUMBER_REQ_RCV xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="">\n`
        xmlString += `  <HEADER>\n`
        xmlString += `    <TLGNAME>TIANUMBER_REQ_RCV</TLGNAME>\n`
        xmlString += `    <SENDER>SAP</SENDER>\n`
        xmlString += `    <RECEIVER>MES</RECEIVER>\n`
        xmlString += `  </HEADER>\n`
        xmlString += `  <REQUEST_NUMBER>${XML_HEADERS.REQUEST_NUMBER}</REQUEST_NUMBER>\n`
        xmlString += `  <REQUEST_ITEM_NUMBER>${XML_HEADERS.REQUEST_ITEM_NUMBER}</REQUEST_ITEM_NUMBER>\n`
        xmlString += `  <REF_DOC_NUMBER>${XML_HEADERS.REF_DOC_NUMBER}</REF_DOC_NUMBER>\n`
        xmlString += `  <REF_DOC_ITEM>${XML_HEADERS.REF_DOC_ITEM}</REF_DOC_ITEM>\n`
        xmlString += `  <REF_DOC_TYPE>${XML_HEADERS.REF_DOC_TYPE}</REF_DOC_TYPE>\n`
        xmlString += `  <ACTION>${XML_HEADERS.ACTION}</ACTION>\n`
        xmlString += `  <REQUEST_TYPE>${XML_HEADERS.REQUEST_TYPE}</REQUEST_TYPE>\n`
        xmlString += `  <PLANT_ID>${XML_HEADERS.PLANT_ID}</PLANT_ID>\n`
        xmlString += `  <USER_NAME_ID>${XML_HEADERS.USER_NAME_ID}</USER_NAME_ID>\n`
        xmlString += `  <USER_NAME_DESC>${XML_HEADERS.USER_NAME_DESC}</USER_NAME_DESC>\n`
        xmlString += `  <SAP_PRODUCT_CODE>${sapCode}</SAP_PRODUCT_CODE>\n`

        normalizedRows.forEach((row) => {
          const value = row['Value'] !== undefined ? row['Value'] : ''
          const valueDesc = row['Value Description'] !== undefined ? row['Value Description'] : ''
          const propName = row['Property']

          const propertyDesc = PROPERTY_DESCRIPTIONS[propName] || 'DEFAULT'

          xmlString += `  <PRODUCT_ATTRIBUTES>\n`
          xmlString += `    <PROPERTY>${propName}</PROPERTY>\n`
          xmlString += `    <PROPERTYDESCRIPTION>${propertyDesc}</PROPERTYDESCRIPTION>\n`
          xmlString += `    <VALUE>${value}</VALUE>\n`
          xmlString += `    <VALUEDESCRIPTION>${valueDesc}</VALUEDESCRIPTION>\n`
          xmlString += `  </PRODUCT_ATTRIBUTES>\n`
        })

        xmlString += `</TIANUMBER_REQ_RCV>`

        zip.file(`${sapCode}.xml`, xmlString)
        count++
      }

      if (count === 0) {
        $q.notify({
          type: 'warning',
          message: 'No se encontraron productos válidos para generar TIAs.',
          position: 'top-right',
        })
        isProcessing.value = false
        return
      }

      // Empaquetado final y descarga
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const downloadUrl = URL.createObjectURL(zipBlob)

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'telegramas_tias.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
      generatedCount.value = count
      $q.notify({
        type: 'positive',
        message: `¡Éxito! Se generaron ${count} telegramas.`,
        position: 'top-right',
        icon: 'check_circle',
      })
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Ocurrió un error al procesar el archivo.',
        position: 'top-right',
      })
      console.error(error)
    } finally {
      isProcessing.value = false
    }
  }

  reader.readAsArrayBuffer(excelFile.value)
}

const downloadTemplate = () => {
  // 1. Definimos los datos crudos con los encabezados exactos
  const templateData = [
    ['SAP Product Code', 'Property', 'Value', 'Value Description'],
    ['CNP110T461M00V0002', 'FLY', 'CN', 'CASING PIPE'],
    ['CNP110T461M00V0002', 'CRQ', '005137', 'RUN READY (MRR4)'],
    ['CNP110T461M00V0002', 'DM', '139.70', '139.70'],
    ['LPAPI5LX65MW0V0274', 'FLY', 'LP', 'PIPE LINE ON SHORE'],
    ['LPAPI5LX65MW0V0274', 'PRO', '040', 'SMLS'],
  ]

  // 2. Convertimos el arreglo en una hoja de cálculo
  const worksheet = XLSX.utils.aoa_to_sheet(templateData)

  // Ajustamos el ancho de las columnas para que se vea estético al abrirlo
  worksheet['!cols'] = [
    { wch: 25 }, // SAP Product Code
    { wch: 15 }, // Property
    { wch: 15 }, // Value
    { wch: 30 }, // Value Description
  ]

  // 3. Creamos el libro de trabajo y le añadimos la hoja
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla TIA')

  // 4. Detonamos la descarga en el navegador
  XLSX.writeFile(workbook, 'Plantilla_Ingesta_TIA.xlsx')
}

const normalizeNumbers = (rows) => {
  let system = 'UNKNOWN'

  // Paso 1: Deducir el sistema evaluando los números de este producto
  for (const row of rows) {
    if (NUMERIC_PROPERTIES.includes(row['Property'])) {
      const val = String(row['Value'] || '')

      // Si tiene ambos, evaluamos cuál está al final
      if (val.includes('.') && val.includes(',')) {
        system = val.lastIndexOf(',') > val.lastIndexOf('.') ? 'EU' : 'US'
        break
      }
    }
  }

  // Si no se dedujo arriba, buscamos pistas como valores terminados en ,XX (ej. 406,40)
  if (system === 'UNKNOWN') {
    for (const row of rows) {
      if (NUMERIC_PROPERTIES.includes(row['Property'])) {
        const val = String(row['Value'] || '')
        if (val.includes(',') && !val.includes('.') && val.match(/,\d{2}$/)) {
          system = 'EU'
          break
        }
      }
    }
  }

  // Por defecto, si no hay anomalías, asumimos el sistema normal (US)
  if (system === 'UNKNOWN') system = 'US'

  // Paso 2: Transformar los valores numéricos basándonos en el sistema deducido
  return rows.map((row) => {
    if (!NUMERIC_PROPERTIES.includes(row['Property'])) return row // Ignoramos los de texto

    let val = String(row['Value'] || '').trim()
    let desc = String(row['Value Description'] || '').trim()

    if (system === 'EU') {
      val = val.replace(/\./g, '').replace(',', '.')
      desc = desc.replace(/\./g, '').replace(',', '.')
    } else if (system === 'US') {
      val = val.replace(/,/g, '')
      desc = desc.replace(/,/g, '')
    }

    return { ...row, Value: val, 'Value Description': desc }
  })
}
</script>
