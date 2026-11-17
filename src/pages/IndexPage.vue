<template>
  <q-page padding>
    <div class="row justify-center q-mt-lg">
      <div class="col-12 col-md-7">
        <q-card flat bordered class="bg-white">
          <q-tabs
            v-model="inputMode"
            dense
            class="text-grey-7"
            active-color="primary"
            indicator-color="primary"
            align="justify"
          >
            <q-tab name="paste" icon="content_paste" label="Pegar desde Excel" />
            <q-tab name="file" icon="upload_file" label="Subir archivo Excel" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="inputMode" animated>
            <q-tab-panel name="paste" class="q-pa-md">
              <div class="row justify-between items-center q-mb-xs">
                <div class="text-subtitle2 text-grey-8">
                  Copia las filas en tu Excel original (Ctrl + C) y pégalas aquí (Ctrl + V)
                </div>
                <q-btn
                  v-if="pastedText"
                  flat
                  dense
                  size="sm"
                  color="grey-7"
                  icon="clear"
                  label="Limpiar"
                  @click="pastedText = ''"
                />
              </div>

              <q-input
                v-model="pastedText"
                type="textarea"
                outlined
                rows="8"
                placeholder="CNJ55PE000000V0179	FLY	CN	CASING PIPE&#10;CNJ55PE000000V0179	DM	219,08	219,08&#10;CNJ55PE000000V0179	DM_IN	8,625	8,625"
              />

              <div v-if="parsedPasteStats.rows > 0" class="text-caption text-primary q-mt-xs">
                Detectadas <strong>{{ parsedPasteStats.rows }}</strong> filas de
                <strong>{{ parsedPasteStats.products }}</strong> producto(s).
              </div>
            </q-tab-panel>

            <q-tab-panel name="file" class="q-pa-md">
              <div class="row justify-between items-center q-mb-sm">
                <div class="text-subtitle2 text-grey-8">Selecciona un archivo .xlsx o .xls</div>
                <q-btn
                  flat
                  color="primary"
                  icon="download"
                  label="Descargar plantilla"
                  size="sm"
                  class="q-px-sm"
                  @click="downloadTemplate"
                />
              </div>

              <q-file
                v-model="excelFile"
                label="Cargar Excel"
                accept=".xlsx, .xls"
                outlined
                clearable
              />
            </q-tab-panel>
          </q-tab-panels>

          <q-card-section class="q-pt-none">
            <q-btn
              class="full-width text-weight-bold"
              color="primary"
              label="Generar Telegramas"
              icon="settings_applications"
              :disable="!canGenerate"
              :loading="isProcessing"
              @click="handleGenerate"
            />

            <q-banner
              v-if="generatedCount !== null"
              class="bg-green-1 text-green-10 q-mt-md rounded-borders"
              dense
              rounded
            >
              <template v-slot:avatar>
                <q-icon name="task_alt" color="green-8" />
              </template>
              Se empaquetaron <strong>{{ generatedCount }}</strong> TIAs en el archivo ZIP correctamente.
            </q-banner>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mt-lg bg-white">
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
              <li>
                <strong>Pegado directo (recomendado):</strong> Selecciona las 4 columnas en tu
                Excel de origen (con o sin encabezados) y pégalas directamente.
              </li>
              <li>
                <strong>Archivo Excel (.xlsx / .xls):</strong> Columnas requeridas:
                <strong>SAP Product Code</strong>, <strong>Property</strong>,
                <strong>Value</strong> y <strong>Value Description</strong>.
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
import { ref, computed } from 'vue'
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
const inputMode = ref('paste')
const pastedText = ref('')
const excelFile = ref(null)
const isProcessing = ref(false)
const generatedCount = ref(null)

const PAD_6_PROPS = ['CRQ', 'ENP', 'EPB', 'EPP', 'ETC', 'FTC', 'PCK_MV']
const PAD_3_PROPS = ['CSP', 'DYT', 'EST', 'FOR', 'ISP', 'NOR', 'OSP', 'PRO', 'RLH', 'TTR', 'TYP']

const parsePastedRows = (text) => {
  if (!text || !text.trim()) return []

  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  const rows = []

  lines.forEach((line, index) => {
    const cols = line.split('\t')
    const col0 = (cols[0] || '').trim()
    const col1 = (cols[1] || '').trim()

    if (index === 0 && col0.toLowerCase() === 'sap product code') return
    if (!col0 || !col1) return

    rows.push({
      'SAP Product Code': col0,
      Property: col1,
      Value: (cols[2] || '').trim(),
      'Value Description': (cols[3] || '').trim(),
    })
  })

  return rows
}

const parsedPasteStats = computed(() => {
  const rows = parsePastedRows(pastedText.value)
  const uniqueProducts = new Set(rows.map((r) => r['SAP Product Code']))
  return {
    rows: rows.length,
    products: uniqueProducts.size,
  }
})

const canGenerate = computed(() => {
  if (inputMode.value === 'paste') return parsedPasteStats.value.rows > 0
  return Boolean(excelFile.value)
})

const handleGenerate = async () => {
  if (!canGenerate.value) return

  isProcessing.value = true
  generatedCount.value = null

  try {
    if (inputMode.value === 'paste') {
      const rawData = parsePastedRows(pastedText.value)
      await buildZipFromRows(rawData)
    } else {
      await processExcelFile(excelFile.value)
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Ocurrió un error al procesar los datos.',
      position: 'top-right',
    })
    console.error(error)
  } finally {
    isProcessing.value = false
  }
}

const processExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rawData = XLSX.utils.sheet_to_json(worksheet)

        await buildZipFromRows(rawData)
        resolve()
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

const buildZipFromRows = async (rawData) => {
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

  for (const [sapCode, rows] of Object.entries(groupedData)) {
    const flyRow = rows.find((r) => String(r['Property'] || '').trim() === 'FLY')
    if (!flyRow) continue

    const flyValue = String(flyRow['Value'] || '').trim()
    const allowedProps = FAMILY_PROPERTIES[flyValue]
    if (!allowedProps) continue

    const filteredRows = rows
      .map((r) => ({
        ...r,
        Property: String(r['Property'] || '').trim(),
      }))
      .filter((r) => allowedProps.includes(r['Property']))

    const normalizedRows = normalizeRowsData(filteredRows)

    const requiredDefaults = ['QCP_NUMBER', 'QCP_REVISION', 'TQ_ITEM', 'TQ_NUMBER', 'TQ_VERSION']
    requiredDefaults.forEach((prop) => {
      const exists = normalizedRows.some((row) => row['Property'] === prop)
      if (!exists) {
        normalizedRows.push({
          Property: prop,
          Value: 'NOT APPLICABLE',
          'Value Description': 'NOT APPLICABLE',
        })
      }
    })

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
    return
  }

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
}

const normalizeRowsData = (rows) => {
  let system = 'UNKNOWN'

  for (const row of rows) {
    if (NUMERIC_PROPERTIES.includes(row['Property'])) {
      const val = String(row['Value'] || '')
      if (val.includes('.') && val.includes(',')) {
        system = val.lastIndexOf(',') > val.lastIndexOf('.') ? 'EU' : 'US'
        break
      }
    }
  }

  if (system === 'UNKNOWN') {
    for (const row of rows) {
      if (NUMERIC_PROPERTIES.includes(row['Property'])) {
        const val = String(row['Value'] || '')
        if (val.includes(',') && !val.includes('.') && val.match(/,\d{2,3}$/)) {
          system = 'EU'
          break
        }
      }
    }
  }

  if (system === 'UNKNOWN') system = 'US'

  const normalized = rows.map((row) => {
    const prop = row['Property']
    let val = String(row['Value'] ?? '').trim()
    let desc = String(row['Value Description'] ?? '').trim()

    if (!NUMERIC_PROPERTIES.includes(prop)) {
      if (/^\d+$/.test(val)) {
        if (PAD_6_PROPS.includes(prop)) val = val.padStart(6, '0')
        else if (PAD_3_PROPS.includes(prop)) val = val.padStart(3, '0')
      }
      return { ...row, Value: val, 'Value Description': desc }
    }

    if (system === 'EU') {
      val = val.replace(/\./g, '').replace(',', '.')
      desc = desc.replace(/\./g, '').replace(',', '.')
    } else {
      val = val.replace(/,/g, '')
      desc = desc.replace(/,/g, '')
    }

    return { ...row, Value: val, 'Value Description': desc }
  })

  // Validación física cruzada contra desfases x1000 generados por Excel
  const getNum = (prop) => {
    const found = normalized.find((r) => r['Property'] === prop)
    return found ? parseFloat(found['Value']) : NaN
  }

  const inchPairs = [
    { inProp: 'DM_IN', mmProp: 'DM' },
    { inProp: 'WT_IN', mmProp: 'WT' },
    { inProp: 'SDD_IN', mmProp: 'SDD' },
    { inProp: 'SDL_IN', mmProp: 'SDL' },
  ]

  const ftPairs = [
    { mmProp: 'LHF', ftProp: 'LHF_FT' },
    { mmProp: 'LHT', ftProp: 'LHT_FT' },
  ]

  return normalized.map((row) => {
    const prop = row['Property']
    const numVal = parseFloat(row['Value'])
    if (isNaN(numVal)) return row

    const inchPair = inchPairs.find((p) => p.inProp === prop)
    if (inchPair) {
      const mmVal = getNum(inchPair.mmProp)
      if (!isNaN(mmVal)) {
        const expectedIn = mmVal / 25.4
        if (Math.abs(numVal / 1000 - expectedIn) < 0.25 && Math.abs(numVal - expectedIn) > 1) {
          const fixed = (numVal / 1000).toFixed(3)
          return { ...row, Value: fixed, 'Value Description': fixed }
        }
      }
    }

    const ftPair = ftPairs.find((p) => p.mmProp === prop)
    if (ftPair) {
      const ftVal = getNum(ftPair.ftProp)
      if (!isNaN(ftVal)) {
        const expectedMm = ftVal * 304.8
        if (Math.abs(numVal * 1000 - expectedMm) < 50 && Math.abs(numVal - expectedMm) > 100) {
          const fixed = Math.round(numVal * 1000).toString()
          return { ...row, Value: fixed, 'Value Description': fixed }
        }
      }
    }

    return row
  })
}

const downloadTemplate = () => {
  const templateData = [
    ['SAP Product Code', 'Property', 'Value', 'Value Description'],
    ['CNP110T461M00V0002', 'FLY', 'CN', 'CASING PIPE'],
    ['CNP110T461M00V0002', 'CRQ', '005137', 'RUN READY (MRR4)'],
    ['CNP110T461M00V0002', 'DM', '139.70', '139.70'],
    ['LPAPI5LX65MW0V0274', 'FLY', 'LP', 'PIPE LINE ON SHORE'],
    ['LPAPI5LX65MW0V0274', 'PRO', '040', 'SMLS'],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(templateData)
  worksheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 30 }]

  // Formatear celdas como texto para mitigar conversiones al pegar
  Object.keys(worksheet).forEach((cellKey) => {
    if (!cellKey.startsWith('!')) {
      worksheet[cellKey].t = 's'
      worksheet[cellKey].z = '@'
    }
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla TIA')
  XLSX.writeFile(workbook, 'Plantilla_Ingesta_TIA.xlsx')
}
</script>
