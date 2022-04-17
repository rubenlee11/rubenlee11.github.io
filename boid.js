//鸟
const
    BOIDS = [],         //鸟类组，包含位置、速度信息
    //NUM_BOIDS = Number.parseInt(document.getElementById("numBoids").value),      //鸟的个数   
    NUM_BOIDS = 100,        //鸟群数量
    SPEED_BOID = 100,        //鸟速率
    NC = 7,             //相互作用的临界拓扑距离
    NS = 0.03,           //相互作用的噪声大小（表征鸟群温度）
    SCLAE_INIT = 0.04    //初始位置范围，正方形边长占画布的比例
    FPS_UPDATE = 5,    //速度刷新帧率（赫兹）
    FPS_DRAW = 30;      //动画帧率（赫兹）
    RANGE_ESCAPE = 50,        //碰撞检测距离
    INTENSITY_ESCAPE = 0.3;       //碰撞强度

//捕食者
const
    PREDATORS = [],
    NUM_PREDATORS = 0;         //捕食者数量
    SPEED_PREDATOR = 40;   


//动画
const
    CANVAS = document.getElementById("myCanvas"),
    CONTEXT = CANVAS.getContext("2d");
let
    drawLast = Date.now(),    //重绘，上次执行的时刻
    updateLast = Date.now(),  //更新速度，上次执行的时刻
    animateButton = document.getElementById("animateButton"),
    START = false;

class Boid {
    //鸟的基本信息，包括位置，速率，方向，序号，拓扑距离
    constructor(){
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.idx = 0;
    this.color = "#fffff";
    this.topDistance = new Array(NUM_BOIDS).fill(0);
    this.mtrDistance = new Array(NUM_BOIDS).fill(0);
    }
    //更新此鸟的拓扑距离数组
    updateDistance(){
        //更新此鸟的度规距离数组
        this.topDistance.fill(0);

        for (let j = 0; j<NUM_BOIDS; j += 1){
            this.mtrDistance[j] = Cal.dis(this,BOIDS[j]);
        }

        //冒泡排序
        for (let j = 0; j < NUM_BOIDS; j += 1){
            for (let k = 0; k < NUM_BOIDS; k += 1){
                if (this.mtrDistance[k] > this.mtrDistance[j]){
                    this.topDistance[k] += 1;
                }
            }
        } 
    }

    //拓扑相互作用后更新方向
    updateStateInt(){
        const angle = Math.random() * 2 * Math.PI;    //随机方向
        let vx = 0, vy = 0;
        //临近鸟的方向平均
        for ( let i = 0; i<NUM_BOIDS; i += 1){
            if (this.topDistance[i] <= NC && this.topDistance[i] !=0){
                vx += BOIDS[i].vx;
                vy += BOIDS[i].vy;
            }
        }
        const 
        v = Math.sqrt(Math.pow(vx,2) + Math.pow(vy,2));

        vx = vx / v;
        vy = vy / v;
        const vecV = Cal.vel(vx,vy,angle,NS);

        //更新方向
        this.vx = vecV.x;
        this.vy = vecV.y;
    }
    //躲避捕食者
    updateStatePdt(){
        for (let j = 0; j < NUM_PREDATORS; j++){
            const
            vecR = {
                x: this.x - PREDATORS[j].x ,
                y: this.y - PREDATORS[j].y},
            vecRModule = Math.sqrt(Math.pow(vecR.x,2) + Math.pow(vecR.y,2)),
            vecN = {
                x: vecR.x / vecRModule,
                y: vecR.y / vecRModule},        
            vProjection = this.vx * vecN.x + this.vy * vecN.y,
            angle = Math.random() * Math.PI * (this.vx * vecN.y - this.vy * vecN.x) / Math.abs(this.vx * vecN.y - this.vy * vecN.x);
            //避障条件：在障碍范围内且速度朝向障碍物
            if(Cal.dis(this, PREDATORS[j]) < RANGE_ESCAPE && vProjection < 0){
                const velocity = Cal.vel(this.vx, this.vy, angle, INTENSITY_ESCAPE);
                this.vx = velocity.x;
                this.vy = velocity.y;
            }
            //更新速度方向
        }
    }
    //周期性边界检测
    updateStateBdr(){
        //右边界
        if (this.x > CANVAS.width){
            this.x -=  CANVAS.width;
        }
        //左边界
        if (this.x  < 0){
            this.x +=  CANVAS.width;
        }
        //上边界
        if (this.y  > CANVAS.height){
            this.y -=  CANVAS.height;
        }
        //下边界
        if (this.y  < 0){
            this.y +=  CANVAS.height;
        }
    }
    //画鸟
    drawBoid(){
        const angle = Math.atan2(this.vy, this.vx);
        CONTEXT.save();   
        CONTEXT.translate(this.x, this.y);
        CONTEXT.rotate(angle);
        CONTEXT.translate(-this.x, -this.y);
        CONTEXT.fillStyle = this.color; 
        CONTEXT.beginPath();
        CONTEXT.moveTo(this.x, this.y);
        CONTEXT.lineTo(this.x - 8, this.y + 2);
        CONTEXT.lineTo(this.x - 8, this.y - 2);
        CONTEXT.lineTo(this.x, this.y);
        CONTEXT.fill();
        CONTEXT.restore(); 
    }
}

class Predator{
    constructor(){
        this.x = 0;
        this.y = 0;
        this.width = 20;
        this.height = 20;
        this.vx = 0;
        this.vy = 0;
    }
    //周期性边界条件
    updateStateBdr(){
        //右边界
        if (this.x > CANVAS.width){
            this.x -=  CANVAS.width;
        }
        //左边界
        if (this.x  < 0){
            this.x +=  CANVAS.width;
        }
        //上边界
        if (this.y  > CANVAS.height){
            this.y -=  CANVAS.height;
        }
        //下边界
        if (this.y  < 0){
            this.y +=  CANVAS.height;
        }
    }
    //画捕食者
    drawPredator(){
        const angle = Math.atan2(this.vy, this.vx);
        CONTEXT.save();   
        CONTEXT.translate(this.x, this.y);
        CONTEXT.rotate(angle);
        CONTEXT.translate(-this.x, -this.y);
        CONTEXT.fillStyle = "#11ff88"; 
        CONTEXT.beginPath();
        CONTEXT.moveTo(this.x, this.y);
        CONTEXT.lineTo(this.x - 16, this.y + 4);
        CONTEXT.lineTo(this.x - 16, this.y - 4);
        CONTEXT.lineTo(this.x, this.y);
        CONTEXT.fill();
        CONTEXT.restore();
    }
}

class Cal {

    static dis(obj1,obj2){
        return Math.sqrt(
            (obj1.x - obj2.x) * (obj1.x - obj2.x) +
            (obj1.y - obj2.y) * (obj1.y - obj2.y));
    }

    static vel(vx,vy,angle,eta){
        const
        ux = (1 - eta + eta * Math.cos(angle)) * vx - eta * vy * Math.sin(angle),
        uy = (1 - eta + eta * Math.cos(angle)) * vy + eta * vx * Math.sin(angle),
        u = Math.sqrt(Math.pow(ux,2) + Math.pow(uy,2));

        return(
            {x: SPEED_BOID * ux / u, y: SPEED_BOID * uy / u}
        );
    }

};

//初始化鸟
function initBoids(){
    //const angleBoid =  Math.random() * 2 * Math.PI;      //鸟群初始方向
    const angleBoid =  0.5 * Math.PI;
    const vx = SPEED_BOID * Math.cos(angleBoid);
    const vy = SPEED_BOID * Math.sin(angleBoid);

    for (let i = 0; i<NUM_BOIDS; i += 1){
        const angle = Math.random() * 2 * Math.PI;      //随机方向
        const velocity = Cal.vel(vx,vy,angle,NS);
        
        BOIDS.push(new Boid());

        BOIDS[i].x = ((1 - SCLAE_INIT) / 2 + SCLAE_INIT * Math.random()) * CANVAS.width;
        BOIDS[i].y = ((1 - SCLAE_INIT) / 2 + SCLAE_INIT * Math.random()) * CANVAS.height - 0.4 * CANVAS.height;
        BOIDS[i].vx = velocity.x;
        BOIDS[i].vy = velocity.y;  
        BOIDS[i].idx = i;
    }
}

//初始化障碍物
function initPredators(){
    for (let i = 0; i<NUM_PREDATORS; i += 1){
        PREDATORS.push(new Predator);

        //const anglePredator =  Math.random() * 2 * Math.PI;
        const anglePredator =  1.5 * Math.PI;
        const vx = SPEED_PREDATOR * Math.cos(anglePredator);
        const vy = SPEED_PREDATOR * Math.sin(anglePredator);

        //PREDATORS[i].x =  Math.random() * CANVAS.width;
        //PREDATORS[i].y = Math.random() * CANVAS.height;
        PREDATORS[i].x =  0.5 * CANVAS.width;
        PREDATORS[i].y = 1 * CANVAS.height;
        PREDATORS[i].vx = vx;
        PREDATORS[i].vy = vy;
    }
}

/* //封闭边界条件
function fixBounding(i){
    //右边界
    if (BOIDS[i].x > CANVAS.width){
        BOIDS[i].x =  2 * CANVAS.width - BOIDS[i].x;
        BOIDS[i].vx *= -1; 
    }
    //左边界
    if (BOIDS[i].x  < 0){
        BOIDS[i].x *= -1;
        BOIDS[i].vx *= -1;
    }
    //上边界
    if (BOIDS[i].y  > CANVAS.height){
        BOIDS[i].y =  2 * CANVAS.height - BOIDS[i].y;
        BOIDS[i].vy *= -1; 
    }
    //下边界
    if (BOIDS[i].y  < 0){
        BOIDS[i].y *= -1;
        BOIDS[i].vy *= -1;
    }
} */

//绘制所有鸟和障碍物，更新位置
function drawAll(){
    CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);

    for (let j = 0; j < NUM_PREDATORS; j += 1) {
        PREDATORS[j].drawPredator();
        PREDATORS[j].x += PREDATORS[j].vx / FPS_DRAW;
        PREDATORS[j].y += PREDATORS[j].vy / FPS_DRAW;
        PREDATORS[j].updateStateBdr();
    }
    for (let i = 0; i<NUM_BOIDS; i += 1) {
        BOIDS[i].drawBoid();
        BOIDS[i].x += BOIDS[i].vx / FPS_DRAW;
        BOIDS[i].y += BOIDS[i].vy / FPS_DRAW;
        BOIDS[i].updateStateBdr();
        BOIDS[i].updateStatePdt();     
    }
}

//动画
function animationLoop(){
    const 
        now = Date.now(),
        drawElapsed = now - drawLast,
        updateElapsed = now - updateLast;

    if(drawElapsed > 1000 / FPS_DRAW){
        drawLast = Date.now();
        drawAll();
    }
    if(updateElapsed > 1000 / FPS_UPDATE){
        updateLast = Date.now();
        //更新领导者方向
        /* const angle =  Math.random() * 2 * Math.PI;
        const vecV = Cal.vel(BOIDS[0].vx,BOIDS[0].vy,angle,0.05)
        BOIDS[0].vx = vecV.x;
        BOIDS[0].vy = vecV.y; */

        for (let i = 0; i<NUM_BOIDS; i += 1) {
            BOIDS[i].updateDistance();
            BOIDS[i].updateStateInt();
        }
    }
    if (START){
        window.requestAnimationFrame(animationLoop);  
    }  
}

//运行
window.onload = () => {
    window.initPredators();
    window.initBoids();
    BOIDS[0].color = "ffffff";
    BOIDS[0].vx = 10;
    BOIDS[0].vy = 10;
    window.requestAnimationFrame(animationLoop);
};

//事件
animateButton.onclick = function(e){
    if (START){
        START = false;
        animateButton.value = '开始';
    }
    else{
        START = true;
        animateButton.value ='暂停';
        window.requestAnimationFrame(animationLoop);
    }
}




