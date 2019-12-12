
s = "a1234aaeio"
let vowwels = ['a','e','i','o','u'];


console.log(vowwels.indexOf('v'))

for (i = 0; i<s.length; i++){
    if ('a' in vowwels){
        console.log(s[i])
    }
}
