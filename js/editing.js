// import { saveAs } from 'file-saver';

let isDownloadable = false;
let resize = true;      //start()を実行した時にリサイズするかどうか
let screenHeight;       //画面高さ(px)
let screenWidth;        //画面幅(px)
let pxPerMM;
let customData  = {
    '#screen-size-inch' : '',
    '#pixel-resolution' : '',
    '#screen-height'    : '',
    '#screen-width'     : '',
};
const rulerLeftSrc = './images/ruler_left.png';
const rulerRightSrc = './images/ruler_right.png';
const rulerLeftFacingSrc = './images/facing_left.png';
const rulerRightFacingSrc = './images/facing_right.png';
const defaultBackgroundImage = './images/transparent_image.png';
let backgroundColor;
let nBackgroundColor = 1;
let prevRulerBlightness = 0;
const dulation = 0;

function allowDownload(downloadable=true) {
    isDownloadable = downloadable;
    $('#download-btn-white').css('display', downloadable ? 'inline' : 'none');
    $('#download-btn-gray').css('display', downloadable ? 'none' : 'inline');
}

// 背景画像をとってきてfuncに渡す関数
function getBackgroundImageData(func) {
    const $image = $('#cropper-img');

    const image = new Image();
    image.addEventListener('load', () => {
        const canvas = document.createElement('canvas');

        canvas.width = screenWidth;
        canvas.height = screenHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, screenWidth, screenHeight);

        func([canvas.toDataURL()], '');
    });

    image.src = $image.cropper('getCroppedCanvas').toDataURL();
}

// 背景カラーの画像を作ってfuncに渡す
function getBackgroundColorData(func) {
    const canvas = document.createElement('canvas');

    canvas.width = screenWidth;
    canvas.height = screenHeight;
    const ctx = canvas.getContext('2d');
    
    let backgroundStyle;
    if(backgroundColor.includes('linear-gradient')) {
        let gradient = backgroundColor;
        gradient = gradient.replace('linear-gradient(', '').replace(')', '');
        const colors = gradient.split(', ');

        backgroundStyle = ctx.createLinearGradient(0, 0, screenWidth, screenHeight);

        backgroundStyle.addColorStop(0, colors[0]);
        backgroundStyle.addColorStop(1, colors[1]);
    }else {
        backgroundStyle = backgroundColor;
    }

    ctx.fillStyle = backgroundStyle;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    func([canvas.toDataURL()], '');
}


// 定規を合成してダウンロードする
function getRulerData(images, type, func) {
    const isLeft           = $('#ruler-arrangement').val() == 'left';
    const shouldShowFacing = $('#ruler-facing').prop("checked");
    let file;

    if(!type) {
        if(shouldShowFacing) {
            file = (isLeft ? rulerLeftFacingSrc : rulerRightFacingSrc);
        }else {
            getRulerData(images, type='ruler', func);
            return;
        }
    }else if(type == 'ruler') {
        file = (isLeft ? rulerLeftSrc : rulerRightSrc);
    }

    const image = new Image();
    image.addEventListener('load', function(){
        // fileで指定されたファイルを描画
        const image = new Image();
        image.addEventListener('load', () => {
            const canvas = document.createElement('canvas');
        
            canvas.width = screenWidth;
            canvas.height = screenHeight;
            const ctx = canvas.getContext('2d');
            const height = 1000*pxPerMM;
            const width  = 18*pxPerMM;
            ctx.drawImage(
                image,
                isLeft ? 0 : screenWidth - width,
                screenHeight-height,
                width,
                height
            );
            const imageData = ctx.getImageData(0, 0, screenWidth, screenHeight);
            const data = imageData.data;
            let blightness = Math.trunc($('#ruler-blightness').val() * 255 / 100);
            if(type != 'ruler') blightness = $('#ruler-blightness').val() > 50 ? 0 : 255;

            for (let y = 0; y < imageData.height; y++) {
                for (let x = 0; x < imageData.width; x++) {
                    const index = (x + y * imageData.width) * 4;
                    data[index] = blightness;
                    data[index + 1] = blightness;
                    data[index + 2] = blightness;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            
            images.push(canvas.toDataURL());
            if(!type) getRulerData(images, type='ruler', func);
            else {
                // 画像の合成＆ダウンロード
                func(images);
            }
            });
        image.src = file;
    }, false);

    image.src = file;
}
function drawAndDownloadImage(images) {
    const canvas = document.createElement('canvas');
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    const ctx = canvas.getContext('2d');
    let nImage = 0

    const image = new Image();
    image.addEventListener('load', () => {
        nImage++;

        ctx.drawImage(image, 0, 0, screenWidth, screenHeight);
        if(nImage < images.length) image.src = images[nImage];
        else {
            // ダウンロードの画面を表示
            $('#downloading-screen-container').off();
            $('#downloading-screen-container').css('display', 'flex');
            $('#downloading-screen').css('display', 'flex')
            $('#downloading-screen1').css('display', 'flex');
            $('#downloading-screen2').css('display', 'none');
            $('#image-container').css('display', 'none');
            $('#container').html('');
            // プログレスバーを表示
            const bar = new ProgressBar.Line(container, {
                strokeWidth: 4,
                easing: 'easeInOut',
                duration: dulation,
                color: 'aqua',
                trailColor: '#eee',
                trailWidth: 1,
                svgStyle: {width: '100%', height: '100%'}
            });
            bar.animate(1.0); 

            setTimeout(() => {
                // 画像をダウンロード
                $("#file_dl").prop("href", canvas.toDataURL());
                // リンクをクリックする
                document.getElementById("file_dl").click(); 
                // canvas.toBlob(function(blob) {
                //     saveAs(blob, "ruler.png");
                // });

                $('#downloading-screen1').css('display', 'none');
                $('#downloading-screen2').css('display', 'flex');
                $('#downloading-screen-container').click(() => {
                    $('#downloading-screen-container').css('display', 'none');
                })
            }, dulation);
            $('#image').prop('src', canvas.toDataURL());
        }
    });

    image.src = images[nImage];
}

function showPreview() {
    $('#image-container').css('display', 'block');
    $('#downloading-screen').css('display', 'none');
}

function download() {
    if(isDownloadable) {
        const backgroundType = $('#background-type').val();
        loadScreenSize();
        if(backgroundType == 'image') {
            getBackgroundImageData((images) => {
                getRulerData(images, '', (images) => {
                    drawAndDownloadImage(images);
                });
            });
        }else {
            getBackgroundColorData((images) => {
                getRulerData(images, '', () => {
                    drawAndDownloadImage(images);
                });
            });
        }
    }
}

function loadScreenSize(device=null) {
    if(!device) device = getDeviceData();
    prepareDisplay(device);
    screenHeight     = device['height'];
    screenWidth      = device['width'];
    
    const screenSize = device['screen-size'];
    const resolution = device['resolution']
    if(resolution != 0) pxPerMM = resolution/25.4;
    else pxPerMM = (screenHeight**2+screenWidth**2)**0.5/(screenSize*25.4);
}

function getDeviceData() {
    const deviceType = $('#device-type-selection').val();
    const deviceName = $('#device-name-selection-' + deviceType).val();
    if(deviceName == 'その他/カスタム') {
        const device = {
            'type'          : deviceType,
            'name'          : 'その他/カスタム',
            'screen-size'   : Math.trunc($('#screen-size-inch').val()),
            'resolution'    : Math.trunc($('#pixel-resolution').val()),
            'height'        : Math.trunc($('#screen-height').val()), 
            'width'         : Math.trunc($('#screen-width').val())
        };
        return device;
    }
    for (const device of devices) {
        if(device['name'] == deviceName) {
            device['type'] = deviceType;
            return device;
        }
    }
    console.error('該当するデバイスがありません。');
    console.error('デバイス名:', deviceName);
    return null;
}

function prepareDisplay(device=null) {
    if(!device) device = getDeviceData();
    for (let i = 0; i < 5; i++) {
        $('#device-name-selection-' + i).css('display', i == device['type'] ? 'block' : 'none');
    }
    if (device['name'] == 'その他/カスタム') {
        $('#screen-size-custum').css('display', 'block');
        $('#screen-size-inch').val(customData['#screen-size-inch']);
        $('#pixel-resolution').val(customData['#pixel-resolution']);
        $('#screen-height').val(customData['#screen-height']); 
        $('#screen-width').val(customData['#screen-width']);
    }else {
        $('#screen-size-custum').css('display', 'none');
        $('#screen-size-inch').val(device['screen-size']);
        $('#pixel-resolution').val(device['resolution']);
        $('#screen-height').val(device['height']);
        $('#screen-width').val(device['width']);
    }
    $('#device-name').html(device['name']);
}

// 画像とカラーどちらの背景が選ばれているか読み込み、表示を切り替える
function switchBackground() {
    const backgroundType = $('#background-type').val();
    if(backgroundType == 'image') {
        $('#upload-image').css('display', 'block');
        $('#color-preview').css('display', 'none');
        setBackgroundColor('transparent');
        $('#upload-icon').css('display', 'flex');
        allowDownload(false);
    }else {
        $('#upload-image').css('display', 'none');
        $('#color-preview').css('display', 'block');
        showImage(imageSource=null, backgroundColor=backgroundColor);
        $('#upload-icon').css('display', 'none');
    }
    
    $('#rotation-button').css('display', 'none');
    $('#input-image-file').val('');
}

function setBackgroundColor(color=null) {
    if(!color) color = backgroundColor;
    $('#color-preview>div').css('background', color);
    $('.cropper-crop-box').css('background', color);
}

function resizeCropBox() {
    const $image = $('#cropper-img');

    $image.cropper('setContainerData', {
        width: $('#preview').innerWidth(),
        height: $('#preview').innerHeight()
    });

    $('#preview').css('height', 'calc(100% - 100px)');
    loadScreenSize();
    $image.cropper('setAspectRatio', screenWidth/screenHeight);

    const containerData = $image.cropper('getContainerData');
    const canvasData    = $image.cropper('getCanvasData');
    const cropBoxData   = $image.cropper('getCropBoxData');

    if (canvasData['width'] / containerData['width'] > canvasData['height'] / containerData['height']) {
        $image.cropper('setCanvasData', {top: 0, height: containerData['height']});
    }else {
        $image.cropper('setCanvasData', {left: 0, width: containerData['width']});
    }
    if (cropBoxData['width'] / containerData['width'] > cropBoxData['height'] / containerData['height']) {
        $image.cropper('setCropBoxData', {
            top   : (containerData['height'] - (containerData['width']*0.95 * screenHeight / screenWidth))/2,
            left  : containerData['width']*0.025,
            width : containerData['width']*0.95
        });
    }else {
        $image.cropper('setCropBoxData', {
            top    : containerData['height']*0.025,
            left   : (containerData['width'] - (containerData['height']*0.95 * screenWidth / screenHeight))/2,
            height : containerData['height']*0.95
        });
    }
    $('#ruler-preview-left').css('height', 1000*100*pxPerMM/screenHeight + '%');
    $('#ruler-preview-left').css('width', 18*100*pxPerMM/screenWidth + '%');
    $('#ruler-preview-right').css('height', 1000*100*pxPerMM/screenHeight + '%');
    $('#ruler-preview-right').css('width', 18*100*pxPerMM/screenWidth + '%');
    $('#ruler-facing-left').css('height', 1000*100*pxPerMM/screenHeight + '%');
    $('#ruler-facing-left').css('width', 18*100*pxPerMM/screenWidth + '%');
    $('#ruler-facing-right').css('height', 1000*100*pxPerMM/screenHeight + '%');
    $('#ruler-facing-right').css('width', 18*100*pxPerMM/screenWidth + '%')
}

function showImage(imageSource=null, backgroundColor=null) {
    if(!imageSource) {
        imageSource = defaultBackgroundImage;
        $('#rotation-button').css('display', 'none');
    }else {
        $('#rotation-button').css('display', 'flex');
    }
    loadScreenSize();
    let $image = $('#cropper-img');

    // $('#ruler-preview-left').remove();
    $image.cropper('destroy');
    $image.prop('src', imageSource);
    
    $image.cropper({
        viewMode: 1,
        dragMode: 'move',
        aspectRatio: screenWidth/screenHeight,
        responseive: false,
        restore: false,
        guides: false,
        center: false,
        autoCropArea: 0.95,
        cropBoxMovable: false,
        cropBoxResizable: false,
        toggleDragModeOnDblclick: false,
        ready: () => {
            setRuler();
            resizeCropBox();
            if(backgroundColor) setBackgroundColor(backgroundColor);
        },
    });
    allowDownload();
    $('#input-image-file').val('');
}

// クロップボックス内に画像を設置し表示する
function setRuler() {
    $('.cropper-crop-box').append(`<img id="ruler-preview-left" src="${rulerLeftSrc}">`);
    $('.cropper-crop-box').append(`<img id="ruler-preview-right" src="${rulerRightSrc}">`);
    $('.cropper-crop-box').append(`<img id="ruler-facing-left" src="${rulerLeftFacingSrc}">`);
    $('.cropper-crop-box').append(`<img id="ruler-facing-right" src="${rulerRightFacingSrc}">`);
    showRuler();
}

// 定規とその縁取りの表示をそれぞれ切り替え、色を調整する
function showRuler() {
    const isLeft           = $('#ruler-arrangement').val() == 'left';
    const shouldShowFacing = $('#ruler-facing').prop("checked");

    $('#ruler-preview-left').css('display', isLeft ? 'block' : 'none');
    $('#ruler-preview-right').css('display', !isLeft ? 'block' : 'none');
    $('#ruler-facing-left').css('display', isLeft && shouldShowFacing ? 'block' : 'none');
    $('#ruler-facing-right').css('display', !isLeft && shouldShowFacing ? 'block' : 'none');

    prevRulerBlightness = 0
    setRulerColor();
}

// 定規の色を調整する（あんまり重くしない）
function setRulerColor() {
    const rulerBlightness          = $('#ruler-blightness').val();
    const rulerBlightnessGrayscale = Math.trunc(rulerBlightness * 255 / 100);
    const rulerBlightnessRGB       = `rgb(${rulerBlightnessGrayscale}, ${rulerBlightnessGrayscale}, ${rulerBlightnessGrayscale})`;
    const isLeft                   = $('#ruler-arrangement').val() == 'left';
    const shouldShowFacing         = $('#ruler-facing').prop("checked");

    const rulerId = '#ruler-preview-' + (isLeft ? 'left' : 'right');
    $(rulerId).css('filter', `brightness(${rulerBlightness}%)`);

    $("#style").html(`
        #ruler-blightness::-webkit-slider-thumb {
            background: ${rulerBlightnessRGB};
        }
        #ruler-blightness::-moz-range-thumb {
            background: ${rulerBlightnessRGB};
        }
    `);

    if(shouldShowFacing && (50-rulerBlightness) * (50-prevRulerBlightness) <= 0) {
        const facingId = '#ruler-facing-' + (isLeft ? 'left' : 'right');
        $(facingId).css('filter', `brightness(${rulerBlightness > 50 ? '0' : '100'}%)`);
    }

    prevRulerBlightness = rulerBlightness;
}

function rotate() {
    $('#cropper-img').cropper('rotate', '90');
}

function showRulerSetting() {
    $('#ruler-setting-button>i').removeClass('fa-angle-up');
    $('#ruler-setting-button>i').addClass('fa-angle-down');

    $('#setting-container').css('display', 'block');
    $('#background-color-setting').css('display', 'none');
    $('#ruler-setting').css('display', 'block');
    
    const a = $('#upload-icon').css('display')=='none' ? 2 : 1;
    const top = ($('#setting-container').height()*a - $('#ruler-setting').height() - 20) + 'px';
    $('#ruler-setting').css('top', a + '00%')
        .animate({'top': top}, {
            dulation: 100,
            complete: () => {
                $('#ruler-setting').css('top', top);
                $('#ruler-setting-button').off();
                $('#color-preview').off();
                $('body').off();
                $('#color-preview').click((e) =>  {
                    showBackgroundSetting();
                    e.stopPropagation();
                });
                $('body').click(() => {hideSetting('ruler');});
            }
        });

}

function showBackgroundSetting() {
    $('#ruler-setting-button>i').removeClass('fa-angle-down');
    $('#ruler-setting-button>i').addClass('fa-angle-up');

    $('#setting-container').css('display', 'block');
    $('#background-color-setting').css('display', 'block');
    $('#ruler-setting').css('display', 'none');

    const top = ($('#setting-container').height()*2 - $('#background-color-setting').height() - 20) + 'px'; // -20はpadding*2
    $('#background-color-setting').css('top', '200%')
        .animate({'top': top}, {
            dulation: 100,
            complete: () => {
                $('#background-color-setting').css('top', top);
                $('#ruler-setting-button').off();
                $('#color-preview').off();
                $('body').off();
                $('#ruler-setting-button').click((e) =>  {
                    showRulerSetting();
                    e.stopPropagation();
                });
                $('body').click(() => {hideSetting('background-color');});
            }
        });
}

function hideSetting(setting) {
    $('#ruler-setting-button>i').removeClass('fa-angle-down');
    $('#ruler-setting-button>i').addClass('fa-angle-up');

    const a = $('#upload-icon').css('display')=='none' ? 2 : 1;
    $('#ruler-setting-button').off();
    $('#color-preview').off();
    $('body').off();
    if(setting=='ruler') {
        $('#ruler-setting').css('top', `calc(${a}00% - ${($('#ruler-setting').height()+20)}px)`)
            .animate({'top': a + '00%'}, {
                dulation: 100,
                complete: () => {
                    $('#setting-container').css('display', 'none');

                    $('#ruler-setting-button').click((e) =>  {
                        showRulerSetting();
                        e.stopPropagation();
                    });
                    $('#color-preview').click((e) =>  {
                        showBackgroundSetting();
                        e.stopPropagation();
                    });
                }
            });
    }else if(setting=='background-color') {
        $('#background-color-setting').css('top', `calc(200% - ${($('#background-color-setting').height()+20)}px)`)
            .animate({'top': '200%'}, {
                dulation: 100,
                complete: () => {
                    $('#setting-container').css('display', 'none');
                    
                    $('#ruler-setting-button').click((e) =>  {
                        showRulerSetting();
                        e.stopPropagation();
                    });
                    $('#color-preview').click((e) =>  {
                        showBackgroundSetting();
                        e.stopPropagation();
                    });
                }
            });
    }
}

function start() {
    const device = getDeviceData();
    if(!device['width'] || !device['height'] || (!device['screen-size'] && !device['resolution'])) {
        $('#error-screen-size').css('display', (!device['width'] || !device['height']) ? 'inline' : 'none');
        $('#error-resolution').css('display', (!device['screen-size'] && !device['resolution']) ? 'inline' : 'none');
    }else {
        if(device['name'] == 'その他/カスタム') {
            customData['#screen-size-inch'] = device['screen-size'];
            customData['#pixel-resolution'] = device['resolution'];
            customData['#screen-height']    = device['height'];
            customData['#screen-width']     = device['width'];
        }
        $('#device-selection-container').css('display', 'none');
        loadScreenSize(device);
        if(resize) resizeCropBox();
        resize = false;
        $('#device-selection-container').click(() => {start();});
    }
}

$(() => {
    loadScreenSize();

    backgroundColor = $('#color' + nBackgroundColor).attr('data-color');
    switchBackground();
    $('#color' + nBackgroundColor).css('border', '5px solid #00FF00');
    $('#downloading-screen-container').css('display', 'none');

    for (let i = 0; i < 26; i++) {
        const elem = $('#color' + i);
        const color = elem.attr('data-color');
        elem.css('background', color);
        elem.click(() => {
            $('#color' + i).css('border', '5px solid #00FF00');
            if(i != nBackgroundColor) $('#color' + nBackgroundColor).css('border', '5px solid gray');
            console.log(color);

            backgroundColor = color;
            nBackgroundColor = i;
            setBackgroundColor();
            hideSetting('background-color')
        });
    }

    let $image = $('#cropper-img');
    $image.cropper({
        viewMode: 1,
        dragMode: 'move',
        aspectRatio: screenWidth/screenHeight,
        responseive: false,
        restore: false,
        guides: false,
        center: false,
        autoCropArea: 0.95,
        cropBoxMovable: false,
        cropBoxResizable: false,
        toggleDragModeOnDblclick: false,
        ready: () => {
            setRuler();
            resizeCropBox();
        },
    });

    // $(window).on("orientationchange", () => {
    //     resizeCropBox();
    // });

    $('#device-type-selection').change(() => {
        prepareDisplay();
        resize = true;
    });
    for (let i = 0; i < 5; i++) {
        $('#device-name-selection-' + i).change(() => {
            prepareDisplay();
            resize = true;
        });
    };
    $('#screen-height').change(() => {resize = true;});
    $('#screen-width').change(() => {resize = true;});
    $('#screen-size-inch').change(() => {resize = true;});
    $('#pixel-resolution').change(() => {resize = true;});

    $('#background-type').change(() => {switchBackground();});
    // 親へのイベントの伝播を止める
    $('#device-selection').click((e) => {e.stopPropagation();});
    $('#downloading-screen').click((e) => {e.stopPropagation();});
    $('#image-container').click((e) => {e.stopPropagation();});
    $('#delete-button1').click(() => {$('#downloading-screen-container').css('display', 'none');});
    $('#delete-button2').click(() => {$('#downloading-screen-container').css('display', 'none');});

    $('#ruler-setting').click((e) => {e.stopPropagation();});
    $('#background-color-setting').click((e) => {e.stopPropagation();});
    $('#ruler-setting-button').click((e) =>  {
        showRulerSetting();
        e.stopPropagation();
    });
    $('#color-preview').click((e) =>  {
        showBackgroundSetting();
        e.stopPropagation();
    });

    $('#input-image-file').change((e) =>  {
        const reader = new FileReader();
        reader.onload = function (e) {
            showImage(e.target.result);
            $('#upload-icon').css('display', 'none');
        }
        reader.readAsDataURL(e.target.files[0]);
    });

    $('#ruler-blightness').on('input', () => {setRulerColor();})
    $('#ruler-arrangement').change(() => {showRuler();});
    $('#ruler-facing').change(() => {showRuler();});

    let timer = false;
    let prewidth = $(window).width();
    $(window).resize(() => {
        if (timer !== false) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            let nowWidth = $(window).width();
            if(prewidth !== nowWidth){
                // リサイズ
                resizeCropBox();
                // 定規や背景の設定が開いていた場合は閉じる
                hideSetting('ruler');
                hideSetting('background-color');
            }
            prewidth = nowWidth;
        }, 200);
    });

    // setTimeout(() => {
    //     start();
    // }, 200);
});
    

const devices = [
    {'name': 'iPhone 15 Pro Max', 'screen-size': 6.7, 'resolution': 460, 'height': 2796, 'width': 1290},
    {'name': 'iPhone 15 Pro', 'screen-size': 6.1, 'resolution': 460, 'height': 2556, 'width': 1179},
    {'name': 'iPhone 15 Plus', 'screen-size': 6.7, 'resolution': 460, 'height': 2796, 'width': 1290},
    {'name': 'iPhone 15', 'screen-size': 6.1, 'resolution': 460, 'height': 2556, 'width': 1179},
    {'name': 'iPhone 14 Pro Max', 'screen-size': 6.7, 'resolution': 460, 'height': 2796, 'width': 1290},
    {'name': 'iPhone 14 Pro', 'screen-size': 6.1, 'resolution': 460, 'height': 2556, 'width': 1179},
    {'name': 'iPhone 14 Plus', 'screen-size': 6.7, 'resolution': 458, 'height': 2778, 'width': 1284},
    {'name': 'iPhone 14', 'screen-size': 6.1, 'resolution': 460, 'height': 2532, 'width': 1170},
    {'name': 'iPhone SE (第 3 世代)', 'screen-size': 4.7, 'resolution': 326, 'height': 1334, 'width': 750},
    {'name': 'iPhone 13 Pro Max', 'screen-size': 6.7, 'resolution': 458, 'height': 2778, 'width': 1284},
    {'name': 'iPhone 13 Pro', 'screen-size': 6.1, 'resolution': 460, 'height': 2532, 'width': 1170},
    {'name': 'iPhone 13', 'screen-size': 6.1, 'resolution': 460, 'height': 2532, 'width': 1170},
    {'name': 'iPhone 13 mini', 'screen-size': 5.4, 'resolution': 476, 'height': 2340, 'width': 1080},
    {'name': 'iPhone 12 Pro Max', 'screen-size': 6.7, 'resolution': 458, 'height': 2778, 'width': 1284},
    {'name': 'iPhone 12 Pro', 'screen-size': 6.1, 'resolution': 460, 'height': 2532, 'width': 1170},
    {'name': 'iPhone 12', 'screen-size': 6.1, 'resolution': 460, 'height': 2532, 'width': 1170},
    {'name': 'iPhone 12 mini', 'screen-size': 5.4, 'resolution': 476, 'height': 2340, 'width': 1080},
    {'name': 'iPhone SE (第 2 世代)', 'screen-size': 4.7, 'resolution': 326, 'height': 1334, 'width': 750},
    {'name': 'iPhone 11 Pro', 'screen-size': 5.8, 'resolution': 458, 'height': 2436, 'width': 1125},
    {'name': 'iPhone 11 Pro Max', 'screen-size': 6.5, 'resolution': 458, 'height': 2688, 'width': 1242},
    {'name': 'iPhone 11', 'screen-size': 6.1, 'resolution': 326, 'height': 1792, 'width': 828},
    {'name': 'iPhone XS', 'screen-size': 5.8, 'resolution': 458, 'height': 2436, 'width': 1125},
    {'name': 'iPhone XS Max', 'screen-size': 6.5, 'resolution': 458, 'height': 2688, 'width': 1242},
    {'name': 'iPhone XR', 'screen-size': 6.1, 'resolution': 326, 'height': 1792, 'width': 828},
    {'name': 'iPhone X', 'screen-size': 5.8, 'resolution': 458, 'height': 2436, 'width': 1125},
    {'name': 'iPhone 8', 'screen-size': 4.7, 'resolution': 326, 'height': 1334, 'width': 750},
    {'name': 'iPhone 8 Plus', 'screen-size': 5.5, 'resolution': 401, 'height': 1920, 'width': 1080},
    {'name': 'iPhone 7', 'screen-size': 4.7, 'resolution': 326, 'height': 1334, 'width': 750},
    {'name': 'iPhone 7 Plus', 'screen-size': 5.5, 'resolution': 401, 'height': 1920, 'width': 1080},
    {'name': 'iPhone SE', 'screen-size': 4, 'resolution': 326, 'height': 1136, 'width': 640},
    {'name': 'iPhone 6s', 'screen-size': 4.7, 'resolution': 326, 'height': 1334, 'width': 750},
    {'name': 'iPhone 6s Plus', 'screen-size': 5.5, 'resolution': 401, 'height': 1920, 'width': 1080},
    {'name': 'iPhone 6', 'screen-size': 4.7, 'resolution': 326, 'height': 1334, 'width': 750},
    {'name': 'iPhone 6 Plus', 'screen-size': 5.5, 'resolution': 401, 'height': 1920, 'width': 1080},
    {'name': 'iPhone 5s', 'screen-size': 4, 'resolution': 326, 'height': 1136, 'width': 640},
    {'name': 'iPhone 5c', 'screen-size': 4, 'resolution': 326, 'height': 1136, 'width': 640},
    {'name': 'iPhone 5', 'screen-size': 4, 'resolution': 326, 'height': 1136, 'width': 640},
    {'name': 'iPhone 4s', 'screen-size': 3.5, 'resolution': 326, 'height': 960, 'width': 640},
    {'name': 'iPhone 4', 'screen-size': 3.5, 'resolution': 326, 'height': 960, 'width': 640},
    {'name': 'iPhone 3GS', 'screen-size': 3.5, 'resolution': 163, 'height': 480, 'width': 320},
    {'name': 'iPhone 3G', 'screen-size': 3.5, 'resolution': 163, 'height': 480, 'width': 320},
    {'name': 'iPhone', 'screen-size': 3.5, 'resolution': 163, 'height': 480, 'width': 320},
    {'name': 'iPad Pro 12.9 インチ (第 6 世代)', 'screen-size': 12.9, 'resolution': 264, 'height': 2732, 'width': 2048},
    {'name': 'iPad Pro 11 インチ (第 4 世代)', 'screen-size': 11, 'resolution': 264, 'height': 2388, 'width': 1668},
    {'name': 'iPad Pro 12.9 インチ (第 5 世代)', 'screen-size': 12.9, 'resolution': 264, 'height': 2732, 'width': 2048},
    {'name': 'iPad Pro 11 インチ (第 3 世代)', 'screen-size': 11, 'resolution': 264, 'height': 2388, 'width': 1668},
    {'name': 'iPad Pro 12.9 インチ (第 4 世代)', 'screen-size': 12.9, 'resolution': 264, 'height': 2732, 'width': 2048},
    {'name': 'iPad Pro 11 インチ (第 2 世代)', 'screen-size': 11, 'resolution': 264, 'height': 2388, 'width': 1668},
    {'name': 'iPad Pro 12.9 インチ (第 3 世代)', 'screen-size': 12.9, 'resolution': 264, 'height': 2732, 'width': 2048},
    {'name': 'iPad Pro 11 インチ', 'screen-size': 11, 'resolution': 264, 'height': 2388, 'width': 1668},
    {'name': 'iPad Pro 12.9 インチ (第 2 世代)', 'screen-size': 12.9, 'resolution': 264, 'height': 2732, 'width': 2048},
    {'name': 'iPad Pro (10.5 インチ)', 'screen-size': 10.5, 'resolution': 264, 'height': 2224, 'width': 1668},
    {'name': 'iPad Pro (9.7 インチ)', 'screen-size': 9.7, 'resolution': 264, 'height': 2048, 'width': 1536},
    {'name': 'iPad Pro (12.9 インチ)', 'screen-size': 12.9, 'resolution': 264, 'height': 2732, 'width': 2048},
    {'name': 'iPad Air (第 5 世代)', 'screen-size': 10.9, 'resolution': 264, 'height': 2360, 'width': 1640},
    {'name': 'iPad Air (第 4 世代)', 'screen-size': 10.9, 'resolution': 264, 'height': 2360, 'width': 1640},
    {'name': 'iPad Air (第 3 世代)', 'screen-size': 10.5, 'resolution': 264, 'height': 2224, 'width': 1668},
    {'name': 'iPad Air 2', 'screen-size': 9.7, 'resolution': 264, 'height': 2048, 'width': 1536},
    {'name': 'iPad Air', 'screen-size': 9.7, 'resolution': 264, 'height': 2048, 'width': 1536},
    {'name': 'iPad mini (第 6 世代)', 'screen-size': 8.3, 'resolution': 326, 'height': 2266, 'width': 1488},
    {'name': 'iPad mini (第 5 世代)', 'screen-size': 7.9, 'resolution': 326, 'height': 2048, 'width': 1536},
    {'name': 'iPad mini 4', 'screen-size': 7.9, 'resolution': 326, 'height': 2048, 'width': 1536},
    {'name': 'iPad mini 3', 'screen-size': 7.9, 'resolution': 326, 'height': 2048, 'width': 1536},
    {'name': 'iPad mini 2', 'screen-size': 7.9, 'resolution': 326, 'height': 2048, 'width': 1536},
    {'name': 'iPad mini', 'screen-size': 7.9, 'resolution': 163, 'height': 1024, 'width': 768},
    {'name': 'iPad (第 10 世代)', 'screen-size': 10.9, 'resolution': 264, 'height': 2360, 'width': 1640},
    {'name': 'iPad (第 9 世代)', 'screen-size': 10.2, 'resolution': 264, 'height': 2160, 'width': 1620},
    {'name': 'iPad (第 8 世代)', 'screen-size': 10.2, 'resolution': 264, 'height': 2160, 'width': 1620},
    {'name': 'iPad (第 7 世代)', 'screen-size': 10.2, 'resolution': 264, 'height': 2160, 'width': 1620},
    {'name': 'iPad (第 6 世代)', 'screen-size': 9.7, 'resolution': 264, 'height': 2048, 'width': 1536},
    {'name': 'iPad (第 5 世代)', 'screen-size': 9.7, 'resolution': 264, 'height': 2048, 'width': 1536},
    {'name': 'iPad (第 4 世代)', 'screen-size': 9.7, 'resolution': 264, 'height': 2048, 'width': 1536},
    {'name': 'iPad (第 3 世代)', 'screen-size': 9.7, 'resolution': 264, 'height': 2048, 'width': 1536},
    {'name': 'iPad 2', 'screen-size': 9.7, 'resolution': 132, 'height': 1024, 'width': 768},
    {'name': 'iPad', 'screen-size': 9.7, 'resolution': 132, 'height': 1024, 'width': 768},
    {'name': 'AQUOS wish3', 'screen-size': 5.7, 'resolution': 0, 'height': 1520, 'width': 720},
    {'name': 'AQUOS R8 pro', 'screen-size': 6.6, 'resolution': 0, 'height': 2730, 'width': 1260},
    {'name': 'AQUOS R8', 'screen-size': 6.39, 'resolution': 0, 'height': 2340, 'width': 1080},
    {'name': 'AQUOS sense7', 'screen-size': 6.1, 'resolution': 0, 'height': 2432, 'width': 1080},
    {'name': 'AQUOS sense7 plus', 'screen-size': 6.4, 'resolution': 0, 'height': 2340, 'width': 1080},
    {'name': 'AQUOS wish2', 'screen-size': 5.7, 'resolution': 0, 'height': 1520, 'width': 720},
    {'name': 'AQUOS R7', 'screen-size': 6.6, 'resolution': 0, 'height': 2730, 'width': 1260},
    {'name': 'AQUOS sense6', 'screen-size': 6.1, 'resolution': 0, 'height': 2432, 'width': 1080},
    {'name': 'AQUOS sense5G', 'screen-size': 5.8, 'resolution': 0, 'height': 2280, 'width': 1080},
    {'name': 'arrows N F-51C', 'screen-size': 6.24, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'arrows We F-51B', 'screen-size': 5.7, 'resolution': 0, 'height': 1520, 'width': 720},
    {'name': 'arrows We FCG01', 'screen-size': 5.7, 'resolution': 0, 'height': 1520, 'width': 720},
    {'name': 'arrows We', 'screen-size': 5.7, 'resolution': 0, 'height': 1520, 'width': 720},
    {'name': 'arrows Be4 Plus F-41B', 'screen-size': 5.6, 'resolution': 0, 'height': 1480, 'width': 720},
    {'name': 'arrows NX9 F-52A', 'screen-size': 6.3, 'resolution': 0, 'height': 2280, 'width': 1080},
    {'name': 'arrows 5G F-51A', 'screen-size': 6.7, 'resolution': 0, 'height': 3120, 'width': 1440},
    {'name': 'Galaxy S23 Ultra', 'screen-size': 6.8, 'resolution': 0, 'height': 3088, 'width': 1440},
    {'name': 'Galaxy S23', 'screen-size': 6.1, 'resolution': 0, 'height': 2340, 'width': 1080},
    {'name': 'Galaxy A54 5G', 'screen-size': 6.4, 'resolution': 0, 'height': 2340, 'width': 1080},
    {'name': 'Galaxy A23 5G', 'screen-size': 5.8, 'resolution': 0, 'height': 1560, 'width': 720},
    {'name': 'Galaxy Z Fold4', 'screen-size': 7.6, 'resolution': 0, 'height': 2176, 'width': 1812},
    {'name': 'Galaxy Z Flip4', 'screen-size': 6.7, 'resolution': 0, 'height': 2640, 'width': 1080},
    {'name': 'Galaxy A53 5G', 'screen-size': 6.5, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'Galaxy S22', 'screen-size': 6.1, 'resolution': 0, 'height': 2340, 'width': 1080},
    {'name': 'Galaxy S22 Ultra', 'screen-size': 6.8, 'resolution': 0, 'height': 3088, 'width': 1440},
    {'name': 'motorola edge 40', 'screen-size': 6.55, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'motorola razr 40 ultra', 'screen-size': 6.9, 'resolution': 0, 'height': 2640, 'width': 1080},
    {'name': 'moto g53j 5G', 'screen-size': 6.5, 'resolution': 0, 'height': 1600, 'width': 720},
    {'name': 'moto g13', 'screen-size': 6.5, 'resolution': 0, 'height': 1600, 'width': 720},
    {'name': 'moto g52j 5G', 'screen-size': 6.8, 'resolution': 0, 'height': 2460, 'width': 1080},
    {'name': 'motorola edge 20', 'screen-size': 6.7, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'OPPO Find X3 Pro', 'screen-size': 6.7, 'resolution': 0, 'height': 3216, 'width': 1440},
    {'name': 'OPPO Reno9 A', 'screen-size': 6.4, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'OPPO Reno7 A', 'screen-size': 6.4, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'OPPO Reno5 A', 'screen-size': 6.5, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'OPPO A77', 'screen-size': 6.5, 'resolution': 0, 'height': 1612, 'width': 720},
    {'name': 'OPPO A55s 5G', 'screen-size': 6.5, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'Google Pixel 7a', 'screen-size': 6.1, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'Google Pixel Fold', 'screen-size': 7.6, 'resolution': 0, 'height': 1840, 'width': 2208},
    {'name': 'Google Pixel 7 Pro', 'screen-size': 6.7, 'resolution': 0, 'height': 3120, 'width': 1440},
    {'name': 'Google Pixel 7', 'screen-size': 6.3, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'Google Pixel 6a', 'screen-size': 6.1, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'Google Pixel 6 Pro', 'screen-size': 6.7, 'resolution': 0, 'height': 3120, 'width': 1440},
    {'name': 'Google Pixel 6', 'screen-size': 6.4, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'Xperia 1 V', 'screen-size': 6.5, 'resolution': 0, 'height': 3840, 'width': 1644},
    {'name': 'Xperia 1 IV', 'screen-size': 6.5, 'resolution': 0, 'height': 3840, 'width': 1644},
    {'name': 'Xperia 1 III', 'screen-size': 6.5, 'resolution': 0, 'height': 3840, 'width': 1644},
    {'name': 'Xperia 1 II', 'screen-size': 6.5, 'resolution': 0, 'height': 3840, 'width': 1644},
    {'name': 'Xperia 1', 'screen-size': 6.5, 'resolution': 0, 'height': 3840, 'width': 1644},
    {'name': 'Xperia 5 IV', 'screen-size': 6.1, 'resolution': 0, 'height': 2520, 'width': 1080},
    {'name': 'Xperia 5 III', 'screen-size': 6.1, 'resolution': 0, 'height': 2520, 'width': 1080},
    {'name': 'Xperia 5 II', 'screen-size': 6.1, 'resolution': 0, 'height': 2520, 'width': 1080},
    {'name': 'Xperia 5', 'screen-size': 6.1, 'resolution': 0, 'height': 2520, 'width': 1080},
    {'name': 'Xperia 10 V', 'screen-size': 6.1, 'resolution': 0, 'height': 2520, 'width': 1080},
    {'name': 'Xperia 10 IV', 'screen-size': 6, 'resolution': 0, 'height': 2520, 'width': 1080},
    {'name': 'Xperia Ace III', 'screen-size': 5.5, 'resolution': 0, 'height': 1496, 'width': 720},
    {'name': 'Zenfone 9', 'screen-size': 5.9, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'Zenfone 8 Flip', 'screen-size': 6.67, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'Zenfone 8', 'screen-size': 5.9, 'resolution': 0, 'height': 2400, 'width': 1080},
    {'name': 'Nova Air C', 'screen-size': 7.8, 'resolution': 300, 'height': 1872, 'width': 1404},
    {'name': 'Nova Air', 'screen-size': 7.8, 'resolution': 300, 'height': 1872, 'width': 1404},
    {'name': 'Tab M10（3rd Gen）', 'screen-size': 10.1, 'resolution': 0, 'height': 1920, 'width': 1200},
    {'name': 'Tab M8 (3rd Gen)', 'screen-size': 8, 'resolution': 0, 'height': 1280, 'width': 800},
    {'name': 'aiwa JA3-TBA0802', 'screen-size': 8, 'resolution': 0, 'height': 1280, 'width': 800},
    {'name': 'aiwa JA2-TBW1001', 'screen-size': 10.5, 'resolution': 0, 'height': 1920, 'width': 1280},
    {'name': 'Redmi Pad', 'screen-size': 10.61, 'resolution': 0, 'height': 2000, 'width': 1200},
    {'name': 'LAVIE Tab T10', 'screen-size': 10.61, 'resolution': 0, 'height': 2000, 'width': 1200},
    {'name': 'OPPO Pad Air', 'screen-size': 10.3, 'resolution': 0, 'height': 2000, 'width': 1200},
    {'name': 'Surface Pro 9', 'screen-size': 13.3, 'resolution': 267, 'height': 2880, 'width': 1920},
    {'name': 'Surface Go 3', 'screen-size': 10.5, 'resolution': 220, 'height': 1920, 'width': 1280},
    {'name': 'Fire HD 10', 'screen-size': 10.1, 'resolution': 224, 'height': 1920, 'width': 1200},
    {'name': 'Yoga Tab 11', 'screen-size': 11, 'resolution': 0, 'height': 2000, 'width': 1200},
    {'name': 'Galaxy Tab S8 Ultra', 'screen-size': 14.6, 'resolution': 0, 'height': 2960, 'width': 1848},
    {'name': 'Galaxy Tab S8+', 'screen-size': 12.4, 'resolution': 0, 'height': 2800, 'width': 1752},
    {'name': 'LAVIE Tab T12', 'screen-size': 12.6, 'resolution': 0, 'height': 2560, 'width': 1600},
    {'name': 'FMV LOOX 75/G', 'screen-size': 13.3, 'resolution': 0, 'height': 1920, 'width': 1080},
];