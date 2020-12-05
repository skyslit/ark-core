import logUpdate from 'log-update';
/* eslint-disable require-jsdoc */
export class Term {
  private hasAlreadyMounted: boolean;
  state: any = null;
  constructor() {
    this.state = {};
    this.hasAlreadyMounted = false;
  }

  setState = (state: any) => {
    if (!this.state) {
      this.state = {};
    }
    this.state = Object.assign(this.state, state);
    this.mount();
  }

  mount = () => {
    if (!this.hasAlreadyMounted) {
      this.hasAlreadyMounted = true;
      this.componentDidMount();
    }
    logUpdate(this.render());
  }

  componentDidMount() { }

  render() {
    return '';
  }
}

export function render(Component: typeof Term) {
  const cmp = new Component();
  logUpdate.done();
  cmp.mount();
}
