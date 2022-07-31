/* 
lightweight online lab of monochromator

lens, light beams, blazing grating 
*/

//导入模块
import { data, spectrum } from "./module/data.js";
//程序变量
const
    CANVAS = document.getElementById("myCanvas"),
    CONTEXT = CANVAS.getContext("2d"),
    FPS_DRAW = 60;
let
    drawLast = Date.now(),    //重绘，上次执行的时刻
    animateButton = document.getElementById("animateButton"),
    START = false,
    index = 0;

//初始数据：波长，入射光谱，光栅转角

//单色仪数据
const
    N0 = 1200,               //光栅线数
    FOCUS = 0.3,             //球面透镜焦距0.3m，画布长度的0.6倍
    E1 = 20 * Math.PI / 180,         //epsilon1
    E2 = 40 * Math.PI / 180,         //epsilon2
    THETA = 20 * Math.PI / 180,       //光栅特征角度
    G0 = 0.05,      //光栅离入射缝、出射缝直线的距离为0.05m

    ANG_VEL = 0.2,       //步进电机角速度 角度/s

    DR_FOCUS = 0.6 * CANVAS.width,
    DR_G0 = (0.05 / 0.3) * CANVAS.width,
    A0 = (DR_FOCUS - DR_G0) * Math.tan(E1),
    B0 = (DR_FOCUS - DR_G0) * Math.tan(E2);
//实验可调参数
let
    IN_WTH = 1,  //入射缝缝宽，单位：mm
    OUT_WTH = 1,  //出射缝缝宽，单位：mm
    L_RANGE = 400,  //测量范围下限
    U_RANGE = 700;  //测量范围上限

//虚拟实验变量
let
    BEAMS = [];
let
    grating = {},
    lens1 = {},
    lens2 = {},
    inSlit = {},
    outSlit = {},

    u0 = 0,         //衍射单元因子宗量
    px2px1 = 0,        //partial x2 partial x1
    px2plmd = 0,       //partial lambda partial x1
    pupx1 = 0,
    puplmd = 0;

class Device {
    constructor() {
        this.position = { x: 0, y: 0 };
        this.color = "#dde5d9";
        this.angle = 0;
    }
}

class Grating extends Device {
    constructor() {
        super();
        this.color = "#9329ae";
        this.blzLambda = 500;   //闪耀角unit: nm
        this.aperture = (0.04 / 0.3) * CANVAS.width;
    }
    //更新与传播相关的系数
    updateCoefficient(idx) {
        const
            gma = data.gamma[idx],
            lmd = data.lambda[idx];
        u0 = 4 * 1e3 * Math.PI * Math.cos(0.5 * (E2 - E1) - gma - THETA) * Math.cos(0.5 * (E2 + E1)) / (lmd * N0);
        px2px1 = 2 * Math.sin(gma + E1) / Math.sin(gma - E2);
        px2plmd = 0.5 * FOCUS * N0 * 1e-3 / Math.sin(gma - E2);
        pupx1 = 2 * 1e3 * (2 * Math.PI * Math.tan(THETA) * Math.sin(E1 + E2)) / (lmd * N0 * FOCUS * Math.sin(gma - E2));
        puplmd = -u0 / lmd - (2 * Math.PI * Math.sin(E2 - gma - THETA)) / (lmd * Math.sin(gma - E2) * Math.cos(THETA));
    }
    //在画布上绘制光栅
    draw() {
        CONTEXT.save();
        CONTEXT.translate(this.x, this.y);
        CONTEXT.rotate(-(0.5 * Math.PI - this.angle * Math.PI / 180));
        CONTEXT.translate(-this.x, -this.y);
        CONTEXT.fillStyle = this.color;
        CONTEXT.beginPath();
        CONTEXT.moveTo(this.x - 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.05);
        CONTEXT.lineTo(this.x + 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.05);
        CONTEXT.lineTo(this.x + 0.5 * this.aperture, this.y - 0.5 * this.aperture * 0.05);
        CONTEXT.lineTo(this.x - 0.5 * this.aperture, this.y - 0.5 * this.aperture * 0.05);
        CONTEXT.moveTo(this.x - 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.05);
        CONTEXT.fill();
        CONTEXT.restore();
    }
}

class Lens extends Device {
    constructor() {
        super();
        this.focus = FOCUS;   //反光镜焦距unit: m
        this.aperture = (0.05 / 0.3) * CANVAS.width;   //反光镜直径unit: m
    }
    //在画布上绘制透镜
    draw() {
        CONTEXT.save();
        CONTEXT.translate(this.x, this.y);
        CONTEXT.rotate(this.angle);
        CONTEXT.translate(-this.x, -this.y);
        CONTEXT.fillStyle = this.color;
        CONTEXT.beginPath();
        CONTEXT.moveTo(this.x - 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.1);
        CONTEXT.lineTo(this.x + 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.1);
        CONTEXT.lineTo(this.x + 0.5 * this.aperture, this.y - 0.5 * this.aperture * 0.1);
        CONTEXT.lineTo(this.x - 0.5 * this.aperture, this.y - 0.5 * this.aperture * 0.1);
        CONTEXT.moveTo(this.x - 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.1);
        CONTEXT.fill();
        CONTEXT.restore();
    }
}

class InSlit extends Device {
    constructor() {
        super();
        this.color = "#33bbb4";
        this.aperture = (0.01 / 0.3) * CANVAS.width;
        this.width = 1     //缝宽unit: mm，但是画图时要被夸大
        this.ints = 0;      //缝检测到的光强
    }
    //在画布上绘制入射缝
    draw() {
        CONTEXT.save();
        CONTEXT.translate(this.x, this.y);
        CONTEXT.rotate(this.angle);
        CONTEXT.translate(-this.x, -this.y);
        CONTEXT.fillStyle = this.color;
        CONTEXT.beginPath();
        CONTEXT.moveTo(this.x - 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.1);
        CONTEXT.lineTo(this.x + 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.1);
        CONTEXT.lineTo(this.x + 0.5 * this.aperture, this.y - 0.5 * this.aperture * 0.1);
        CONTEXT.lineTo(this.x - 0.5 * this.aperture, this.y - 0.5 * this.aperture * 0.1);
        CONTEXT.moveTo(this.x - 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.1);
        CONTEXT.fill();
        CONTEXT.restore();
    }
}

class OutSlit extends Device {
    constructor() {
        super();
        this.color = "#ae293f";
        this.aperture = (0.01 / 0.3) * CANVAS.width;
        this.width = 1     //缝宽unit: mm
        this.ints = 0;      //出射缝光强
    }
    //在画布上绘制出射缝
    draw() {
        CONTEXT.save();
        CONTEXT.translate(this.x, this.y);
        CONTEXT.rotate(this.angle);
        CONTEXT.translate(-this.x, -this.y);
        CONTEXT.fillStyle = this.color;
        CONTEXT.beginPath();
        CONTEXT.moveTo(this.x - 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.1);
        CONTEXT.lineTo(this.x + 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.1);
        CONTEXT.lineTo(this.x + 0.5 * this.aperture, this.y - 0.5 * this.aperture * 0.1);
        CONTEXT.lineTo(this.x - 0.5 * this.aperture, this.y - 0.5 * this.aperture * 0.1);
        CONTEXT.moveTo(this.x - 0.5 * this.aperture, this.y + 0.5 * this.aperture * 0.1);
        CONTEXT.fill();
        CONTEXT.restore();
    }
    //更新出射缝光强
    updateInts(idx) {
        this.ints = 0;
        for (let i = 0; i < 11; i += 1) {
            for (let j = Math.max((idx - 10), 0); j < Math.min((idx + 10), 3000); j += 1) {
                BEAMS[i][j].updatePos(idx);
                if (Math.abs(BEAMS[i][j].finPos) < 0.5 * this.width) {
                    BEAMS[i][j].updateInts(idx);
                    this.ints += BEAMS[i][j].finInts;
                }
            }
        }
    }
}

class Beam {
    constructor(x1, I0, lmd) {
        this.color = "#fffff";
        this.intPos = x1;
        this.finPos = 0;
        this.intInts = I0;
        this.finInts = 0;
        this.lambda = lmd;
    }
    //更新光线在出射缝的位置x2
    updatePos(idx) {
        const lmd = data.lambda[idx];
        this.finPos = px2px1 * this.intPos + px2plmd * (this.lambda - lmd);
    }
    //更新光纤在出射缝的强度I
    updateInts(idx) {
        const lmd = data.lambda[idx];
        this.finInts = this.intInts * (
            Math.pow(Math.sin(u0) / u0, 2) +
            2 * ((Math.sin(u0) / u0) *
                ((u0 * Math.cos(u0) - Math.sin(u0)) / (u0 * u0))) *
            (pupx1 * this.intPos + puplmd * (this.lambda - lmd))
        );
    }
    //绘制光线
    draw() {

    }
}

//扫描，更新出射缝检测强度
function scan(idx) {
    grating.updateCoefficient(idx);
    outSlit.updateInts(idx);
    data.OUT_SPECTRUM.push(outSlit.ints);
}
//绘制单色仪
function drawAll() {
    CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
    grating.draw();
    lens1.draw();
    lens2.draw();
    inSlit.draw();
    outSlit.draw();
}
//初始化单色仪
function initDevice() {
    //初始化指标
    index = (L_RANGE - 400) * 10;
    //初始化光栅
    grating = new Grating();
    grating.x = 0.2 * CANVAS.width + A0;
    grating.y = 0.2 * CANVAS.width + DR_FOCUS - DR_G0;
    grating.angle = data.gamma[index];
    //初始化准直球面镜
    lens1 = new Lens();
    lens1.x = (CANVAS.width - A0 - B0) * 0.5;
    lens1.y = 0.2 * CANVAS.width;
    lens1.angle = -E1;
    //初始化会聚镜
    lens2 = new Lens();
    lens2.x = (CANVAS.width + A0 + B0) * 0.5;
    lens2.y = 0.2 * CANVAS.width;
    lens2.angle = E2;
    //初始化入射缝
    inSlit = new InSlit();
    inSlit.x = (CANVAS.width - A0 - B0) * 0.5;
    inSlit.y = 0.8 * CANVAS.width;
    //初始化出射缝
    outSlit = new OutSlit();
    outSlit.x = (CANVAS.width + A0 + B0) * 0.5;
    outSlit.y = 0.8 * CANVAS.width;
    //初始化光线，BEAMS数组的第一个指标代表入射光位置（从负到正，取11个点），第二个指标代表波长（400nm到700nm）
    let spc = [];
    for (let i = 0; i < 11; i += 1) {
        spc = [];
        for (let j = 0; j < data.lambda.length; j += 1) {
            spc.push(new Beam(0.1 * (i - 5), data.IN_SPECTRUM[j], data.lambda[j]));
        }
        BEAMS[i] = spc;
    }
    //初始化界面
    drawAll();
}
//执行动画
function animationLoop() {
    //判断是否继续
    if (START) {
        const
            now = Date.now(),
            drawElapsed = now - drawLast;
        //if(drawElapsed > 1000*1/FPS_DRAW && index < 3000){
        if (index < 3000) {
            drawLast = Date.now();
            grating.angle = data.gamma[index];
            scan(index);
            drawAll();
            console.log(data.OUT_SPECTRUM[index], index);
            index += 1;
            //绘制光谱图
            $(document).ready(function () {
                $('#chart').highcharts(spectrum);
            })
        }
        else if (index >= 3000) {
            START = false;
            animateButton.value = '开始';
        }
        window.requestAnimationFrame(animationLoop);
    }
}

//运行
window.onload = () => {
    initDevice();
    requestAnimationFrame(animationLoop);
}
//事件
animateButton.onclick = function (e) {
    if (START) {
        START = false;
        animateButton.value = '开始';
    }
    else {
        START = true;
        animateButton.value = '暂停';
        drawLast = Date.now();
        window.requestAnimationFrame(animationLoop);
    }
}

