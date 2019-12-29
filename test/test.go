package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"
)

var (
	endpoint = "http://localhost:8000/update"
	client   = &http.Client{}
	refs     = []string{"https://golang.org/",
		"https://github.com/golang/go",
		"https://www.google.com.tr/",
		"https://www.example.com/",
		"https://test.go/",
		"https://github.com/neaplus/gostats",
	}
)

func main() {
	for {
		req, _ := http.NewRequest("GET", endpoint, nil)
		req.Header.Add("User-Agent", `go/test`)
		req.Header.Add("Referer", refs[rand.Intn(len(refs))])
		resp, _ := client.Do(req)
		fmt.Println(req, resp)
		time.Sleep(200 * time.Millisecond)
	}
}
