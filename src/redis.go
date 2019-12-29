package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gomodule/redigo/redis"
)

var (
	rp       *redis.Pool
	redisURL = "localhost:6379"
	redisDB  = 7
)

func newPool(server string) *redis.Pool {
	return &redis.Pool{
		MaxIdle:     3,
		IdleTimeout: 240 * time.Second,
		Dial: func() (redis.Conn, error) {
			c, err := redis.Dial("tcp", server, redis.DialDatabase(redisDB))
			if err != nil {
				return nil, err
			}
			return c, err
		},
		TestOnBorrow: func(c redis.Conn, t time.Time) error {
			_, err := c.Do("PING")
			return err
		},
	}
}

func deliverUpdates(hub *Hub) {
	r := rp.Get()
	defer r.Close()

	r.Do("CONFIG", "SET", "notify-keyspace-events", "AE")
	psc := redis.PubSubConn{Conn: r}
	if err := psc.PSubscribe(redis.Args{}.AddFlat(fmt.Sprintf("__keyevent@%d*__:*", redisDB))...); err != nil {
		log.Println("psubscribe error: ", err)
	}

	for {
		switch v := psc.Receive().(type) {
		case redis.Message:
			// log.Printf("channel: %s, message: %s\n", v.Channel, v.Data)
			if strings.Contains(v.Channel, "incrby") || strings.Contains(v.Channel, "expired") {
				log.Println("HUB", len(hub.clients))
				if len(hub.clients) > 0 {
					hub.broadcast <- LatestJSON()
					log.Println("HUB DELIVERED ", len(hub.clients))
				}
			}

		case redis.Subscription:
			log.Printf("subscription message: %s: %s %d\n", v.Channel, v.Kind, v.Count)

		case error:
			log.Println("error pub/sub, delivery has stopped")
			return
		}
	}
}

// LatestJSON message
func LatestJSON() []byte {
	result := Latest()
	// log.Println("DATA", result)
	result.Idents = nil
	j, _ := json.Marshal(result)
	return j
}

// Persist stores data to redis
func Persist(g Guest) {
	dt := time.Now()
	r := rp.Get()
	defer r.Close()
	log.Println("Persist", g)
	r.Do("SADD", "domains", g.Source)
	r.Do("INCR", g.Source+"_"+dt.Format("20060102"))
	r.Do("EXPIRE", g.Source+"_"+dt.Format("20060102"), counterHistory*86400)
	r.Do("SET", g.Source+":"+g.Xid, g.Host+"±"+g.Agent, "EX", sessionTimeout*60)
}

// Latest brings data from redis
func Latest() StatusData {
	log.Println("LatestStatusData")
	r := rp.Get()
	defer r.Close()

	result := StatusData{Success: true, Timestamp: time.Now(), Realtime: make(map[string]int), Total: make(map[string]int)}

	r.Send("SMEMBERS", "domains")
	r.Flush()
	result.Domains, _ = redis.Strings(redis.MultiBulk(r.Receive()))

	var keys []string
	for _, d := range result.Domains {
		var key = d + "_" + result.Timestamp.Format("20060102")
		result.Total[d], _ = redis.Int(r.Do("GET", key))
		keys = append(keys, key)
	}

	reply, err := redis.Values(r.Do("SCAN", 0, "MATCH", "*:*", "COUNT", 1000000))
	if err != nil {
		log.Println("redis.Values", err)
	}
	if _, err := redis.Scan(reply, nil, &result.Idents); err != nil {
		log.Println("redis.Scan", err)
	}
	result.Current = len(result.Idents)

	for _, ident := range result.Idents {
		tmp := strings.Split(ident, ":")
		if val, ok := result.Realtime[tmp[0]]; ok {
			result.Realtime[tmp[0]] = val + 1
		} else {
			result.Realtime[tmp[0]] = 1
		}
	}

	return result
}

// RedisConstruct creates redis pool
func RedisConstruct() {
	rp = newPool(redisURL)
}

// RedisDispose clear redis pool
func RedisDispose() {
	rp.Close()
}
