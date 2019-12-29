package main

import "time"

type (
	// Guest middleware type
	Guest struct {
		Source string
		Host   string
		Agent  string
		Xid    string
		Xexist bool
	}

	// StatusData response type
	StatusData struct {
		Success   bool           `json:"success"`
		Message   string         `json:"message"`
		Timestamp time.Time      `json:"timestamp"`
		Domains   []string       `json:"domains"`
		Current   int            `json:"current"`
		Realtime  map[string]int `json:"realtime"`
		Total     map[string]int `json:"total"`
		Idents    []string       `json:"idents"`
	}
)
