class singlePivotFork{
    constructor() {
        this.measure={
            onRakeNeckToPivot: 11,// test
            fromRakeToPivot: -8,// test
            onRakeNeckToAxle: 20,// test
            fromRakeToAxle: 4,// test
            maxBump: 10,//test         
            pivotarm: {
                angle: null,
                length: null,
                line: null,
                makeLine: function(b){
                    if (
                        b.fork.measure.pivotFromNeck.dX === null ||
                        b.fork.measure.axleFromNeck.dX === null ||
                        b.fork.measure.pivotFromNeck.dY  === null ||
                        b.fork.measure.axleFromNeck.dY === null
                    ) { return }
                    const m = b.fork.measure
                    this.line = new Line( new Point(m.pivotFromNeck.dX, m.pivotFromNeck.dY), new Point(m.axleFromNeck.dX, m.axleFromNeck.dY) )
                    m.pivotarm.length = this.line.calculateLength()
                    m.pivotarm.angle = this.line.calculateAngle()
                    return this.line
                },                  
                draw: function(b, ctx){
                    ctx.save()
                    const m = b.fork.measure
                    if (m.pivotarm.length === null){ m.pivotarm.makeLine(b) }//sets up pivot arm endpoints for first draw
                    ctx.lineCap = "round"
                    let w = ctx.lineWidth = m.pivotarm.length * b.drawscale < 50 ? m.pivotarm.length * 2 / b.drawScale : 10 / b.drawScale
                    ctx.strokeStyle = "hsla(" + b.color + ", 100%, 50%, .75)"
                    ctx.beginPath()
                    ctx.moveTo(m.pivotFromNeck.dX, m.pivotFromNeck.dY)
                    ctx.lineTo(m.axleFromNeck.dX, m.axleFromNeck.dY)
                    ctx.stroke()
                    ctx.beginPath()
                    ctx.lineWidth = 1/b.drawScale
                    ctx.strokeStyle = "hsla(" + b.color + ", 0%, 0%, .5)"
                    const pivot = new Point(m.pivotFromNeck.dX, m.pivotFromNeck.dY)
                    const axle = new Point(m.axleFromNeck.dX, m.axleFromNeck.dY)
                    pivot.draw(w/2, ctx)
                    axle.draw(w/2, ctx)
                    b.rearWheel.circle.center.draw(w/2, ctx)
                    ctx.restore()
                },
            },
            pivotFromNeck: {
                dX: null,
                dY: null,       
                calculate: function(b) { 
                    const m = b.fork.measure
                    const a = b.neck.rake 
                    if (a !== null && m.onRakeNeckToPivot !== null && m.fromRakeToPivot !== null) { 
                        m.pivotFromNeck.dX = Math.sin(a) * m.onRakeNeckToPivot + Math.cos(a) * m.fromRakeToPivot 
                        m.pivotFromNeck.dY = Math.cos(a) * m.onRakeNeckToPivot - Math.sin(a) * m.fromRakeToPivot
                    } else { return }
                    return b.fork.measure.pivotFromNeck
                }
            },
            drawLeg: function(b,ctx){
                ctx.save()
                ctx.beginPath()
                ctx.lineCap = "round"
                ctx.strokeStyle = "hsla(" + b.color + ", 100%, 50%, .5)"
                ctx.lineWidth = 15/b.drawScale
                ctx.moveTo(b.fork.measure.pivotFromNeck.dX,b.fork.measure.pivotFromNeck.dY)
                ctx.lineTo(b.neck.bottom.x, b.neck.bottom.y)
                ctx.stroke()
                ctx.restore()
            },
            axleFromNeck:{
                dX: null, 
                dY: null,
                calculate: function(b){
                    const m = b.fork.measure
                    const a = b.neck.rake 
                    if (a !== null && m.rakeNeckToAxle !== null && m.rakeLineToAxle !== null) {
                        m.axleFromNeck.dX = Math.sin(a) * m.onRakeNeckToAxle + Math.cos(a) * m.fromRakeToAxle 
                        m.axleFromNeck.dY = Math.cos(a) * m.onRakeNeckToAxle - Math.sin(a) * m.fromRakeToAxle
                    } else { return }
                    b.frontWheel.centerFromNeck = {dX: m.axleFromNeck.dX, dY: m.axleFromNeck.dY}
                    b.frontWheel.setCircle()
                    b.rearWheel.findCenter(b)
                    b.rearWheel.setCircle()
                    return b.fork.measure.axleFromNeck
                }
            }
        }
        this.travel = {
            pivotIncrement: -.01,
            positions: [],
            showArm: true,
            leading: 1,
            calculatePositions: function(b){
                try {
                    const m = b.fork.measure
                    const t = b.fork.travel
                    let bump = 0
                    let pc = 0
                    let x, y
                    if (m.pivotFromNeck.dX > m.axleFromNeck.dX){ 
                        t.leading = -1
                        if (t.pivotIncrement < 0){ t.pivotIncrement*=t.leading }
                    }
                    m.pivotarm.toAxle = {
                        dX: Math.cos(m.pivotarm.angle) * m.pivotarm.length,
                        dY: Math.sin(m.pivotarm.angle) * m.pivotarm.length,
                    } 
                    this.positions.push({
                        pivotChange: pc,
                        pivotAngle: m.pivotarm.angle, 
                        axleFromNeck: m.axleFromNeck,
                        pivotarm: new Line(new Point(m.pivotFromNeck.dX, m.pivotFromNeck.dY), new Point(m.axleFromNeck.dX,m.axleFromNeck.dY)),
                        bump: bump,
                        color: b.color,
                        rakeLine: b.neck.rakeLine,
                        frontGroundLine: new Line(
                            new Point(m.axleFromNeck.dX-b.wheelbase, m.axleFromNeck.dY + b.frontWheel.radius),
                            new Point(m.axleFromNeck.dX+b.wheelbase, m.axleFromNeck.dY + b.frontWheel.radius)
                        ),
                        frontContactPatch: new Point(m.axleFromNeck.dX, m.axleFromNeck.dY+b.frontWheel.radius),
                    })
                    for (pc= t.pivotIncrement; bump < m.maxBump && Math.PI * -2 < pc && pc < Math.PI * 2;   pc+= t.pivotIncrement){                 
                        x = Math.cos( m.pivotarm.angle + pc) * m.pivotarm.length * t.leading + m.pivotFromNeck.dX 
                        y = Math.sin( m.pivotarm.angle + pc) * m.pivotarm.length * t.leading + m.pivotFromNeck.dY
                        bump = m.axleFromNeck.dY - y
                        this.positions.push({
                            pivotChange: pc, 
                            pivotAngle: m.pivotarm.angle + pc,
                            pivotarm: new Line(new Point(m.pivotFromNeck.dX, m.pivotFromNeck.dY), new Point(x,y)),
                            axleFromNeck: { dX: x, dY: y },
                            bump: bump,
                            //color: (b.color + this.positions.length * t.pivotIncrement * 360 / Math.PI )%360,
                            rakeLine: b.neck.rakeLine,
                            frontGroundLine: new Line(
                                new Point(x-b.wheelbase, y+b.frontWheel.radius),
                                new Point(x+b.wheelbase, y+b.frontWheel.radius),
                            ),
                            frontContactPatch: new Point(x, y+b.frontWheel.radius),
                            wheelBase: new Point(x, y+b.frontWheel.radius).getDistance(
                                new Point(b.rearWheel.circle.x, b.rearWheel.circle.x + b.rearWheel.radius)
                            ),
                        })
                    }
                    if (this.positions.length < 100){
                        b.fork.travel.positions = []
                        b.fork.travel.pivotIncrement *= .5
                        b.fork.travel.calculatePositions(b)
                        return
                    }
                    for (let p in this.positions){
                        this.positions[p].intersectRakeGround = this.positions[p].rakeLine.getIntersection(this.positions[p].frontGroundLine).p
                        this.positions[p].trail = this.positions[p].frontContactPatch.getDistance(this.positions[p].intersectRakeGround)   
                        if (this.positions[p].frontContactPatch.x > this.positions[p].intersectRakeGround.x){ this.positions[p].trail *= -1 }
                        this.positions[p].trailLine = new Line(this.positions[p].frontContactPatch, this.positions[p].intersectRakeGround)
                        this.positions[p].color = (b.color + (360 / this.positions.length) * p)%360
                    } 
                } catch(e) {
                    return
                }
            },
            drawPositions: function(b, ctx){
                const p = b.fork.travel.positions
                const m = b.fork.measure
                let t
                ctx.save()
                ctx.lineWidth = m.pivotarm.length * b.drawscale < 50 ? m.pivotarm.length * .5 / b.drawScale : 2.5 / b.drawScale
                for (t in p){
                    if (b.fork.travel.showArm){
                        ctx.strokeStyle = "hsla(" + p[t].color + ", 50%, 50%, 1)"
                        p[t].pivotarm.draw(ctx)
                        p[t].trailLine.draw(ctx)
                    }
                }
                ctx.restore()
                // ctx.save()
                // ctx.lineCap = "butt"
                // ctx.lineWidth = 4/b.drawScale                
                // for (t in p){
                //     ctx.beginPath()
                //     if (t > 0){ ctx.moveTo(p[t-1].axleFromNeck.dX, p[t-1].axleFromNeck.dY) }
                //     ctx.strokeStyle = "hsla(" + (p[t].color + 180)%360 + ", 50%, 50%, 1)"
                //     ctx.lineTo(p[t].axleFromNeck.dX, p[t].axleFromNeck.dY)
                //     ctx.stroke()
                // }
                // ctx.restore()
            },
        }

    }  
}