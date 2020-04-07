<template>
  <div>
    <div class="header">
      <button @click="fnGetProcesses" class="btn-refresh">Refresh</button>
    </div>
    <div class="content-container">
      <ul>
        <li class="header-row">
          <ul class="list header">
            <li class="item-pid">PID</li>
            <li class="item-name">Name</li>
            <li class="item-port">Port</li>
          </ul>
        </li>
        <li class="item-row" v-for="(task, taskIndex) in filteredTasks" :key="taskIndex">
          <ul class="list">
            <li class="item-pid">
              {{ task.pid }}
            </li>
            <li class="item-name">
              {{ task.imageName }}
            </li>
            <li class="item-port">
              {{ task.local.port }}
              <button @click="fnKillProcess(task.pid)" class="btn-kill">&times;</button>
            </li>
          </ul>
        </li>
      </ul>
    </div>
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
    async fnKillProcess (pid) {
      const taskkill = require('taskkill')

      await taskkill([pid], { force: true, tree: true })

      this.fnGetProcesses()
    },
    async fnGetProcesses () {
      const tasklist = require('tasklist')
      const netstat = require('node-netstat')

      this.filteredTasks = []
      this.nets = []
      this.tasks = await tasklist()

      netstat({
        sync: true,
        filter: {
          protocol: 'tcp',
          state: 'LISTENING'
        }
      }, (data) => {
        this.nets.push(data)
      })

      this.nets.forEach(net => {
        if (net.local.address && net.local.address.indexOf('0.0.0.0') > -1) {
          return
        }
        this.tasks.forEach(task => {
          if (task.imageName.toUpperCase() === 'SYSTEM') {
            return
          }
          if (task.imageName && net.pid === task.pid) {
            this.filteredTasks.push(Object.assign({}, net, task))
          }
        })
      })

      this.filteredTasks = _.uniqWith(this.filteredTasks, _.isEqual)
    }
  },
  mounted () {
    this.fnGetProcesses()
  }
}
</script>

<style scoped>
  .btn-refresh {width: 100px; height: 40px; line-height: 40px; background-color: rgb(0, 212, 177); color: #686b00; font-weight: 600; border: 1px solid rgb(0, 212, 177); border-radius: 5px; position: absolute; top: 5px; right: 10px; cursor: pointer;}
  ul, li {list-style: none; padding: 0;}
  ul.header {height: 30px; line-height: 30px;}
  ul.list {width: 100%;}
  ul.list li {position: relative; display: inline-block; text-align: center; border-top: 1px solid #ccc; height: 30px; line-height: 30px; white-space: nowrap; text-overflow: ellipsis; overflow-x: hidden;}
  ul.header li {background-color: #f1f1f1;}
  ul.list li.item-pid {width: 30%;}
  ul.list li.item-name {width: 40%;}
  ul.list li.item-port {width: 30%;}
  .btn-kill {position: absolute; width: 20px; height: 20px; top: 5px; right: 5px; cursor: pointer; border: 1px solid #da0e0e; background-color: #da0e0e; color: #f1f1f1; font-weight: 600;}
</style>
