<template>
  <div class="layout">
    <div class="header-area">
      <button @click="fnGetProcesses" class="btn-refresh">Refresh</button>
      <label for="filter">Search : </label>
      <input v-model="search" type="text" id="filter" @input="fnSearch" autofocus />
    </div>
    <div class="content-container">
      <div>
        <ul class="list header">
          <li class="item-pid">PID</li>
          <li class="item-name">Name</li>
          <li class="item-port">Port</li>
        </ul>
      </div>
      <ul class="item-list">
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
      search: '',
      filteredTasks: [],
      tasks: [],
      nets: []
    }
  },
  methods: {
    fnCloneDeep (target) {
      return JSON.parse(JSON.stringify(target))
    },
    fnSearch (event) {
      if (this.search && this.search.length > 0) {
        this.filteredTasks = _.filter(this.tasks, task => {
          return task.imageName.indexOf(this.search) > -1 || task.local.port.toString().indexOf(this.search) > -1
        })
      } else {
        this.filteredTasks = this.tasks
      }
    },
    async fnKillProcess (pid) {
      const taskkill = require('taskkill')

      await taskkill([pid], { force: true, tree: true })

      this.fnGetProcesses()
    },
    async fnGetProcesses () {
      const tasklist = require('tasklist')
      const netstat = require('node-netstat')

      this.tasks = []
      this.filteredTasks = []
      this.nets = []
      const tasks = await tasklist()

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
        tasks.forEach(task => {
          if (task.imageName.toUpperCase() === 'SYSTEM') {
            return
          }
          if (task.imageName && net.pid === task.pid) {
            this.tasks.push(Object.assign({}, net, task))
          }
        })
      })

      this.tasks = _.uniqWith(this.tasks, _.isEqual)
      this.filteredTasks = this.tasks
    }
  },
  mounted () {
    this.fnGetProcesses()
  }
}
</script>

<style scoped>
  .layout {padding: 5px;}
  .header-area {text-align: left; padding-left: 20px; height: 40px; line-height: 40px;}
  .btn-refresh {width: 100px; height: 35px; line-height: 35px; background-color: rgb(0, 212, 177); color: #2e2f00; font-weight: 600; border: 1px solid rgb(0, 212, 177); border-radius: 5px; position: absolute; top: 5px; right: 10px; cursor: pointer;}
  ul, li {list-style: none; padding: 0;}
  ul.header {height: 15px;}
  ul.header li {background-color: #f1f1f1;}
  ul.list {width: 100%;}
  ul.item-list {height: calc(100% - 130px); overflow-y: auto;}
  ul.list li {position: relative; display: inline-block; text-align: center; border-top: 1px solid #ccc; height: 30px; line-height: 30px; white-space: nowrap; text-overflow: ellipsis; overflow-x: hidden;}
  ul.list li.item-pid {width: 30%;}
  ul.list li.item-name {width: 40%;}
  ul.list li.item-port {width: 30%;}
  .btn-kill {position: absolute; width: 20px; height: 20px; top: 5px; right: 5px; cursor: pointer; border: 1px solid #da0e0e; background-color: #da0e0e; color: #f1f1f1; font-weight: 600;}
</style>
