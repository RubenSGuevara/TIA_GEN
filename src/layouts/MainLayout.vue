<template>
  <q-layout view="hHh lpR fFf" class="bg-grey-1">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-icon name="account_tree" size="md" class="q-mr-sm" />
        <q-toolbar-title class="text-weight-bold">
          Generador de Telegramas TIA
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer bordered class="bg-white text-grey-5 text-center q-pa-sm">
      <div class="text-caption">
        Herramienta de estandarización XML para integración MES/SAP
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup>
// El script queda limpio
</script>
