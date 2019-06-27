

var variable = "poopy head ";

function getVar(){
    console.log("fetched")
    return variable;

}

function print(message){
    console.log(message);
}

module.exports.print = print;
module.exports.getName = getVar;



