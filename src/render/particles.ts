interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  drag: number;
  grav: number;
}

const MAX_PARTICLES = 900;

export class Particles {
  list: P[] = [];

  emit(
    x: number,
    y: number,
    color: string,
    count: number,
    speed = 120,
    opts: { size?: number; life?: number; grav?: number; drag?: number; spread?: number; dir?: number } = {},
  ): void {
    const room = MAX_PARTICLES - this.list.length;
    const n = Math.min(count, room);
    for (let i = 0; i < n; i++) {
      const a = opts.dir !== undefined ? opts.dir + (Math.random() - 0.5) * (opts.spread ?? Math.PI * 2) : Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.9);
      const life = (opts.life ?? 0.8) * (0.6 + Math.random() * 0.6);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        max: life,
        size: (opts.size ?? 2.2) * (0.6 + Math.random() * 0.8),
        color,
        drag: opts.drag ?? 2.2,
        grav: opts.grav ?? 0,
      });
    }
  }

  update(dt: number): void {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) {
        l[i] = l[l.length - 1];
        l.pop();
        continue;
      }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      const a = p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
