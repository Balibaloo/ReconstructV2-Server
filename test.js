
myarr = [1, 2, 3, 4]

newArr = myarr.map((val) => {
    if (val == 2) {
        return
    }
    return val
})
newArr.append('123')
console.log(newArr)