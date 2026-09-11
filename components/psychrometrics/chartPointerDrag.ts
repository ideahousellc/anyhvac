import type { PsychrometricChartPoint } from "../../lib/psychrometrics/chart";

export class ChartPointerDragSession {
  private activePointerId: number | undefined;
  private pendingPoint: PsychrometricChartPoint | undefined;

  begin(pointerId: number): void {
    this.activePointerId = pointerId;
    this.pendingPoint = undefined;
  }

  isActive(pointerId: number): boolean {
    return this.activePointerId === pointerId;
  }

  queue(pointerId: number, point: PsychrometricChartPoint): boolean {
    if (!this.isActive(pointerId)) return false;
    this.pendingPoint = point;
    return true;
  }

  takePending(): PsychrometricChartPoint | undefined {
    const point = this.pendingPoint;
    this.pendingPoint = undefined;
    return point;
  }

  end(pointerId: number): PsychrometricChartPoint | undefined {
    if (!this.isActive(pointerId)) return undefined;
    const point = this.takePending();
    this.activePointerId = undefined;
    return point;
  }
}
