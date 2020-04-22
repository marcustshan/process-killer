<template>
  <div id="app">
    <ProcessKiller />
  </div>
</template>

<script>
import ProcessKiller from './views/ProcessKiller.vue'

export default {
  name: 'App',
  components: {
    ProcessKiller
  }
}
</script>

<style>
body {padding: 0; margin: 0; min-height: 100%; max-height: 100%;}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}
</style>
