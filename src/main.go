package main

import (
	"bytes"
	"os/exec"
	"strings"
)

var (
	banner string = "GO_STATS"
)

func init() {
	cmd := exec.Command("figlet")
	cmd.Stdin = strings.NewReader(banner)
	var result bytes.Buffer
	cmd.Stdout = &result
	err := cmd.Run()
	if err == nil {
		banner = result.String()
	}
}
