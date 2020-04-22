<template>
  <div class="layout">
    <div class="header-area">
      <button @click="fnGetProcesses" class="btn-refresh">Refresh</button>
      <label for="filter">Search : </label>
      <input v-model="search" type="text" id="filter" @input="fnSearch" autofocus />
    </div>
    <div class="content-container">
      <table class="task-table" v-show="this.tasks && this.tasks.length > 0">
        <colgroup>
          <col width="20%" />
          <col width="50%" />
          <col width="20%" />
          <col width="10%" />
        </colgroup>
        <thead class="table-header">
          <tr class="header-row">
            <th>PID</th>
            <th>Name</th>
            <th>Port</th>
            <th>Kill</th>
          </tr>
        </thead>
        <tbody class="table-body">
          <tr v-for="(task, taskIndex) in filteredTasks" :key="taskIndex">
            <td>
              {{ task.pid }}
            </td>
            <td>
              {{ task.imageName }}
              <div v-if="task.javaTask && task.javaTask.pid" class="java-info">
                ({{ task.javaTask.name }})
                <button v-if="task.javaTask && task.javaTask.pid" @click="fnShowJavaDetail(task.javaTask)" class="btn detail">상세보기</button>
              </div>
            </td>
            <td>
              {{ task.local.port }}
            </td>
            <td>
              <button @click="fnKillProcess(task.pid)" class="btn kill">&times;</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="whole_dim" v-show="nowLoading || showLayerPopup"></div>
    <div class="loading_container" v-show="nowLoading">
      <div class="loader"></div>
      <div class="loader-text">
        Ctrl + R or F5 단축키로
        <br />
        새로고침이 가능합니다.
      </div>
    </div>

    <div class="layer-popup" v-show="showLayerPopup">
      <div class="close" @click="fnClosePopup"></div>
      <div class="layer-header">
        {{ selectedJavaTask.name }}
      </div>
      <div class="layer-content">
        <div class="no-args-text" v-if="!selectedJavaTask.args || selectedJavaTask.args.length < 1">
          There is no args.
        </div>
        <div class="layer-args" v-for="(arg, index) in selectedJavaTask.args" :key="index">
          {{ arg }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'

export default {
  name: 'ProcessKiller',
  data () {
    return {
      nowLoading: false,
      showLayerPopup: false,
      search: '',
      filteredTasks: [],
      tasks: [],
      nets: [],
      javaTasks: [],
      selectedJavaTask: {}
    }
  },
  methods: {
    fnClosePopup () {
      this.showLayerPopup = false
      this.selectedJavaTask = {}
    },
    fnShowJavaDetail (javaTask) {
      this.selectedJavaTask = javaTask
      this.$nextTick(() => {
        this.showLayerPopup = true
      })
    },
    fnCmdJpsDataCallback (process) {
      const processArgs = process.split(' ')
      const javaTask = {
        pid: processArgs[0].replace(/^\s+|\s+$/g, ''),
        name: processArgs.length > 1 ? processArgs[1] : '',
        args: ''
      }

      if (processArgs.length > 1) {
        processArgs.splice(0, 2)
        javaTask.args = processArgs
      }

      this.javaTasks.push(javaTask)
    },
    fnCmdJpsDone () {
      if (this.javaTasks && this.javaTasks.length > 0) {
        this.javaTasks.forEach(javaTask => {
          this.tasks.some(task => {
            if (Number(task.pid) === Number(javaTask.pid)) {
              task.javaTask = javaTask
              return task.pid === javaTask.pid
            }
          })
        })
      }

      this.nowLoading = false
    },
    fnCmdJpsError () {
      this.nowLoading = false
    },
    fnCmdJps () {
      const nrc = require('node-run-cmd')
      nrc.run('jps -v', {
        onData: this.fnCmdJpsDataCallback,
        onDone: this.fnCmdJpsDone,
        onError: this.fnCmdJpsError
      })
    },
    fnCloneDeep (target) {
      return JSON.parse(JSON.stringify(target))
    },
    fnSearch (event) {
      if (this.search && this.search.length > 0) {
        this.filteredTasks = _.filter(this.tasks, task => {
          if (task.javaTask && task.javaTask.name) {
            return task.imageName.toLowerCase().indexOf(this.search.toLowerCase()) > -1 || task.local.port.toString().indexOf(this.search) > -1 || task.javaTask.name.toLowerCase().indexOf(this.search.toLowerCase()) > -1
          } else {
            return task.imageName.toLowerCase().indexOf(this.search.toLowerCase()) > -1 || task.local.port.toString().indexOf(this.search) > -1
          }
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
      this.nowLoading = true

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

      this.fnCmdJps()
    },
    fnInitKeyEvent () {
      this._keyListener = (e) => {
        if (e.key.toLowerCase() === 'r' && (e.ctrlKey || e.metaKey)) {
          require('electron').remote.getCurrentWindow().reload()
        } else if (e.key === 'F5') {
          require('electron').remote.getCurrentWindow().reload()
        } else if (e.keyCode === 27) {
          if (this.showLayerPopup) {
            this.fnClosePopup()
          } else {
            this.search = ''
            this.fnSearch()
          }
        }
      }

      document.removeEventListener('keyup', this._keyListener.bind(this))
      document.addEventListener('keyup', this._keyListener.bind(this))
    }
  },
  mounted () {
    this.fnGetProcesses()
    this.fnInitKeyEvent()
  }
}
</script>

<style scoped>
  body {width: 100%; height: 100%; max-height: 100%;}
  .layout {width: 100%; height: 100%;}
  .header-area {text-align: left; padding-left: 20px; height: 40px; line-height: 40px; margin: 10px 0;}
  .btn-refresh {width: 100px; height: 35px; line-height: 35px; background-color: rgb(0, 212, 177); color: #2e2f00; font-weight: 600; border: 1px solid rgb(0, 212, 177); border-radius: 5px; position: absolute; top: 15px; right: 10px; cursor: pointer;}
  .btn {cursor: pointer;}
  .btn.kill {border: 1px solid #da0e0e; background-color: #da0e0e; color: #f1f1f1; font-weight: 600;}
  .btn.detail {border: 1px solid #0e7eda; background-color: #0e7eda; color: #f1f1f1; font-weight: 600;}

  .content-container {width: 100%; height: 100%;}
  .task-table {width: 100%; height: 100%; border-collapse: collapse; border: 1px solid #999;}
  .header-row {background-color: #c1c1c1;}
  .header-row th {padding: 8px 0;}
  .table-body td {padding: 8px 0; position: relative; border-bottom: 1px solid #999;}
  .java-info {margin-top: 3px;}

  .layer-popup {z-index: 889; position: fixed; top: 0; left: 0; right: 0; bottom: 0; margin: auto; width: 80%; height : 80%; background-color: #f1f1f1;}
  .layer-header {width: 100%; height: 30px; line-height: 30px; font-weight: 600; padding: 8px 0; font-size: 1.2em; border-bottom: 2px solid #ccc;}
  .layer-content {width: 95%; text-align: left; margin: auto; max-height: 90%; overflow-y: auto;}
  .no-args-text {margin-top: 10px; font-size: 1.2em; font-weight: 600; text-align: center;}
  .layer-args {word-break: break-all; margin: 7px 0;}

  .layer-popup .close { position: absolute; right: 8px; top: 8px; width: 32px; height: 32px; opacity: 0.5; cursor: pointer; }
  .layer-popup .close:hover { opacity: 1; }
  .layer-popup .close:before, .close:after { position: absolute; left: 15px; content: ' '; height: 33px; width: 2px; background-color: #333; }
  .layer-popup .close:before { transform: rotate(45deg); }
  .layer-popup .close:after { transform: rotate(-45deg); }

  .whole_dim {width: 100%;height: 100%;background-color: #777;opacity: 0.7;z-index: 888;position: fixed;top: 0;left: 0;}
  .loading_container {width: 200px;height: 100px;z-index: 889;position: absolute;top: 0;left: 0;right: 0;bottom: 0;margin: auto; text-align: center;}
  .loader { border: 16px solid #f3f3f3; border-radius: 50%; border-top: 16px solid #3498db; width: 120px; height: 120px; -webkit-animation: spin 2s linear infinite; /* Safari */ animation: spin 2s linear infinite; margin: auto; }
  .loader-text { font-weight: 600; color: #ffffff; margin-top: 10px; }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
