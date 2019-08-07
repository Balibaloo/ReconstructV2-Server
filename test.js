var myProm = (var1, var2) => new Promise((resolve, reject) => {
    if (var1 == var2) {
        resolve([var1, var2])
    } else reject(new Error('dumbo'))
});

var myProm2 = (var1, var2) => new Promise((resolve, reject) => {
    if (var1 == var2) {
        resolve([var1, var2])
    } else reject(new Error('dumbo'))
});

var myfunc = (variable) => {
    ds
    return variable
}



myProm('a', 'a')
    .then(myfunc)
    .then(console.log)
    .catch(console.log)