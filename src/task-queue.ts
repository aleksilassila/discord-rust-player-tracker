type Runnable = () => Promise<any>;

interface Task {
  name?: string;
  runnable: Runnable;
}

class TaskQueue {
  static tasks: Task[] = [];

  private static async runNext() {
    const task = this.tasks.shift();

    if (task) {
      await task.runnable().then(async () => await this.runNext());
    }
  }

  private static async startQueue() {
    if (this.tasks.length === 1) {
      await this.runNext();
    } else {
      console.log("Executing later...");
    }
  }

  static addTask(runnable: Runnable, name?: string) {
    if (name && this.tasks.map((t) => t.name).includes(name)) {
      return;
    }

    this.tasks.push({ runnable, name });
    this.startQueue().then();
  }
}

export default TaskQueue;
