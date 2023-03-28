'use strict';

 //fsモジュール...ファイルを扱うモジュール
const fs = require('fs'); 

 //readlineモジュール...ファイルの中身を1行ずつ読み込むモジュール
const readline = require('readline'); 

//fsモジュールのcreateReadStreamメソッドを使ってcsvファイルをストリーム形式で読み込む
const rs = fs.createReadStream('./popu_source.csv');

//新たに変数を作り、readlineモジュールの「createInterface」メソッドに先ほど作ったストリーム情報を渡す
const rl = readline.createInterface({input: rs});

//年代をkey、人口をvalueとして保存できるように、連想配列を準備しておく
const populationMap = new Map();

//結果を書き出すファイルを指定
const resultFile = './result.txt';

//ストリーム形式で読み込まれたテキストを処理していく
//一気に全部の行が処理されるのではなく、1行1行順に処理されていく
//csvファイルのメタデータは、読み込まれないらしい(便利！)
//変数rl(createInterfaceオブジェクト)でlineというイベントが発生したら無名関数を実行するよう、onメソッドで設定する 
//読み込まれたテキストの中身が、自動で無名関数の引数に渡される
rl.on('line', (data) => {  

    //csvファイル内の文字列から、ダブルクォーテーションを削除
    const lineStringWithoutQuotation = data.replaceAll('"', '');

    //csvファイル内の文字列を、,を基準に配列化
    const lineStringArray = lineStringWithoutQuotation.split(',');

    /* 
        男女別・性比カラムが'男女計'かつ、人口カラムが'総人口'かつ、
        年齢総数カラムが'総数'以外かつ、時間軸カラムが'2019年10月1日現在'となっているレコードだけを抽出したいので、
        それ以外のデータはreturn句を使うことで抽出しないようにする
    */
    if (lineStringArray[1] !== '男女計'|| lineStringArray[3] !== '総人口' || 
        lineStringArray[5] === '総数' || lineStringArray[9] !== '2019年10月1日現在') 
        {
        return;
    };

    //正規表現で「歳」と「歳以上」を削除＆読み込まれた数は文字列扱いなので、parseIntで数値に変更
    //(readlineは1行づつ読み込んでいくので、gオプションをつけなくても全行がreplaceの対象となる)
    /* 
        歳.*$
        . 任意の文字列
        * 0回以上の繰り返し
        $ 文字列の最後
        つまり、「歳」か「歳の後に何らかの文字が続く文字列」が文末となる文字列をreplaceの対象とする
    */
    const age = parseInt(lineStringArray[5].replace(/歳.*$/,''));
    

    //年齢を10歳ごとの世代に分けるため変数を用意
    let generation;

    //switch文で、世代を分割
    switch (Math.floor(age/10)*10) {
        case 0:
            generation = '10歳未満';
            break;
        case 100:
            generation = '100歳以上';
            break;
        default:
            generation = `${(Math.floor(age/10)*10)}` + '代';
            break;
    };


    //読み込まれた人口は文字列扱いなので、数値に変換
    const population = parseInt(lineStringArray[11]);

    //generation(世代)をkey、population(人口)をvalueとして連想配列に保存
    //連想配列に当該generationが無ければエントリーを追加し、generationあるならpopulationの値を合算していく
    if(!populationMap.has(generation)){
        populationMap.set(generation, population);
    } else {
        populationMap.set(generation, populationMap.get(generation) + population);
    };
});



//ファイルの読み込みが終了した時に行う処理を、createInterfaceオブジェクトのon()メソッドにcloseを渡すことで設定する
rl.on('close', () => {

    //人口順にソートするため、連想配列を2重配列に変換...[[key,value],[key,value],[key,value]]みたいな形
    //そしてそれを降順(人口が多い順)にソート
    //(ソートが理解しやすいように、変換とソートを分けて記述してます)
    const populationArray = Array.from(populationMap);
    const populationArray_sort = populationArray.sort(function(a,b){
        return b[1] - a[1];  //returnを忘れないように！
    });
    console.log(populationArray_sort);
    
    //別解：Mapのままソート
    //正確には「元Mapの値を展開して新規に配列を作る」->「Mapのvalueに相当していたインデックス[1]でソート」->「その配列をエントリーとして新規にMpaを作成」の流れ
    //新規にMapを作成するので、上記と異なりreturn句は不要
    const populationMap_sort = new Map([...populationMap].sort((a, b) => b[1] - a[1]));  //(上記と違って、アロー関数じゃないとダメっぽい)
    console.log(populationMap_sort);



    //ファイルに書き込む、最初の1行
    fs.appendFileSync(resultFile, '2019年10月1日現在の年代別総人口ランキング [千人] (2重配列とfor文で書き込み)\n');
    //世代とその人口を、指定された形式でファイルに書き込んでいく(2重配列とfor文で書き込み)
    for(let i = 0; i < populationArray_sort.length; i++){

        //数値のままではファイルに書き込めないので、人口の値は文字列に変換しておく
        let populationStr = String(populationArray_sort[i][1]);

        //ファイルに書き出していく
        fs.appendFileSync(resultFile, `${i + 1}位: ${populationArray_sort[i][0]} ${populationStr} \n`);
    };
    fs.appendFileSync(resultFile, '\n\n\n');  //結果が書き込まれたファイル内で、別解との区別がつきやすいように改行をしておく


    //ファイルへの書き込み(別解1)
    fs.appendFileSync(resultFile, '2019年10月1日現在の年代別総人口ランキング [千人] (Mapとfor~of文で書き込み)\n');
    //(Mapとfor~of文で書き込み)
    let n = 1;  //順位に使用する
    for(const [key, value] of populationMap_sort){
        let populationStr = String(value);
        //ファイルに書き出していく
        fs.appendFileSync(resultFile, `${n}位: ${key} ${populationStr} \n`);
        n++;  //次のループのために、順位の値を一つ増やしておく
    };
    fs.appendFileSync(resultFile, '\n\n\n');


    //ファイルへの書き込み(別解2)
    fs.appendFileSync(resultFile, '2019年10月1日現在の年代別総人口ランキング [千人] (2重配列pとfor~each文で書き込み)\n');
    //(2重配列pとfor~each文で書き込み)
    populationArray_sort.forEach((value, index) => {  //forEachの第1引数は配列の要素、第2引数はインデックス、第3引数は処理する配列自体を受け取る
        let populationStr_2 = String(value[1]);
        fs.appendFileSync(resultFile, `${index + 1}位: ${value[0]} ${populationStr_2} \n`);
    });
    fs.appendFileSync(resultFile, '\n\n\n');
});
