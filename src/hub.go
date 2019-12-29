package main

import "fmt"

var (
	hub *Hub
)

func init() {
	hub = newHub()
	go hub.run()
}

// Hub maintains the set of active clients and broadcasts messages.
type Hub struct {
	// Registered clients.
	clients map[*Socket]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Socket

	// Unregister requests from clients.
	unregister chan *Socket
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Socket),
		unregister: make(chan *Socket),
		clients:    make(map[*Socket]bool),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			fmt.Println("Socket > client connected")
			h.clients[client] = true

			client.send <- LatestJSON()
			fmt.Println("HUB Connections : ", len(h.clients))
		case client := <-h.unregister:
			fmt.Println("Socket > client disconnected")
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}

			fmt.Println("HUB Connections : ", len(h.clients))
		case message := <-h.broadcast:
			fmt.Println("Socket <<<BROADCAST>>> ", len(message))
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}
