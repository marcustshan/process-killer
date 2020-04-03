<template>
  <div>

  </div>
</template>

<script>
import _ from 'lodash'

export default {
  name: 'ProcessKiller',
  data () {
    return {
      filteredTasks: [],
      tasks: [],
      nets: []
    }
  },
  methods: {
    async fnGetProcesses () {
      const tasklist = require('tasklist')
      const netstat = require('node-netstat')

      this.filteredTasks = []
      this.nets = []
      this.tasks = await tasklist()

      netstat({
        sync: true,
        filter: {
          protocol: 'tcp'
        }
      }, (data) => {
        this.nets.push(data)
      })

      console.log(this.tasks)
      console.log(this.nets)

      this.nets.forEach(net => {
        if (net.protocol.toUpperCase() !== 'TCP' ||
            !net.local.address ||
            net.local.address.indexOf('0.0.0.0') > -1 ||
            net.state.toUpperCase() !== 'LISTENING') {
          return
        }
        this.tasks.forEach(task => {
          if (task.imageName.toUpperCase() === 'SYSTEM') {
            return
          }
          if (net.pid === task.pid) {
            this.filteredTasks.push(_.merge(net, task))
          }
        })
      })

      console.log(this.filteredTasks)
    }
  },
  mounted () {
    this.fnGetProcesses()
  }
}
</script>

<style scoped>

</style>
