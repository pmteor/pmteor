class MorrisChart {
  constructor(type, options) {
    this._list = [];
    this._morris = new Morris[type](_.extend({
      data: this._list,
      xkey: 'hours',
      resize: true,
      parseTime: false,
      hideHover: 'auto'
    }, options));
  }

  add(doc) {

    // REMOVE LOADER CLASSES
    this._morris.el.removeClass('whirl ringed no-overlay');

    // AND PUSH
    this._list.push(_.extend({
      createdAt: new Date(),
      hours: moment().format('HH:mm')
    }, doc));
  }

  reload() {
    this._morris.setData(this._list);
  }
}

export class MorrisApps {
  constructor() {
    this._instance = Template.instance();

    this.memory = new MorrisChart('Line', {
      element: this._instance.$('#morris-memory'),
      ykeys: ['value'],
      labels: ["Memory"],
      lineColors: ["#31C0BE"],
      hoverCallback(index, options, content, row) {
        const from = moment(row.createdAt).fromNow();
        return `${from}<br/><b>${row.value} ${row.suffix}</b>`;
      }
    });

    this.cpu = new MorrisChart('Area', {
      element: this._instance.$('#morris-cpu'),
      ykeys: ['cpu'],
      labels: ["Cpu"],
      lineColors: ["#7266ba"],
      hoverCallback(index, options, content, row) {
        const from = moment(row.createdAt).fromNow();
        return `${from}<br/><b>${row.cpu} %</b>`;
      }
    });
  }

  reload() {
    this.memory.reload();
    this.cpu.reload();
  }

  add(monit) {
    this.cpu.add({ cpu: monit.cpu });
    this.memory.add(filesize(monit.memory, { output: 'object' }));
  }
}
