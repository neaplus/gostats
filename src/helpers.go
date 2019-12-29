package main

import (
	"io/ioutil"
	"log"
	"math/rand"
	"time"
)

func stringWithCharset(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz" +
		"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	var seededRand *rand.Rand = rand.New(
		rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}

func fillNchars(n int, s string) string {
    b := ""
    for i:=0;i<n;i++{
		b+=s
    }
    return string(b)
}

func readFileAsString(path string) string {
	dat, err := ioutil.ReadFile(path)
	if err != nil {
		log.Println(err)
	}
	return string(dat)
}
