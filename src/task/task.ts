/**
 * A function that should only have one instance running at a time.
 */
export default abstract class Task<T> {
  static isRunning: { [key: string]: boolean } = {};
  protected shouldRun() {
    return true;
  }

  protected getKey(): string {
    return "default";
  }

  protected abstract execute(): Promise<T>;

  public async run(): Promise<T | undefined> {
    if (Task.isRunning[this.getKey()] || !this.shouldRun()) {
      return undefined;
    }

    Task.isRunning[this.getKey()] = true;
    const result = await this.execute();
    Task.isRunning[this.getKey()] = false;
    return result;
  }
}
