package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	b64 "encoding/base64"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/rs/xid"
)

var (
	addr           = flag.String("addr", "0.0.0.0:8000", "http service address")
	filJS          string
	filHTML        string
	sessionTimeout int  = 15
	counterHistory int  = 3
	countPreReq    bool = false
)

func init() {
	if st := os.Getenv("SESSION_TIMEOUT"); st != "" {
		sessionTimeout, _ = strconv.Atoi(st)
	}
	if ch := os.Getenv("COUNTER_HISTORY"); ch != "" {
		counterHistory, _ = strconv.Atoi(ch)
	}
	if cpr := os.Getenv("COUNT_PRE_REQUESTS"); cpr != "" {
		countPreReq, _ = strconv.ParseBool(cpr)
	}
	if ru := os.Getenv("REDIS_URL"); ru != "" {
		redisURL = ru
	}
	if rdb := os.Getenv("REDIS_DB"); rdb != "" {
		redisDB, _ = strconv.Atoi(rdb)
	}
	if auth := os.Getenv("AUTH"); auth != "" && strings.Contains(auth, ":") {
		usr = strings.Split(auth, ":")[0]
		pwd = strings.Split(auth, ":")[1]
	}
	secret = b64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", usr, pwd)))

	filJS = strings.Replace(readFileAsString("public/stats.js"), "[ST]", strconv.Itoa(sessionTimeout*60*1000), 1)
	filHTML = fillNchars(999, "\n") + strings.Replace(readFileAsString("public/bundle.html"),
		"//<!--credentials-->", fmt.Sprintf("window.credentials=['%s'];", secret), 1)

	RedisConstruct()
	go deliverUpdates(hub)

	cleanupHook()
}

func cleanupHook() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	signal.Notify(c, syscall.SIGTERM)
	signal.Notify(c, syscall.SIGKILL)
	go func() {
		<-c
		RedisDispose()
		os.Exit(0)
	}()
}

func main() {
	flag.Parse()
	log.Println("\n" + banner)

	e := echo.New()
	e.HideBanner = true
	e.Logger.SetLevel(0)

	/* Middlewares */
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(serverHeaderMiddleware)
	e.Use(BasicAuthentication())
	// public static file server
	e.Static("/", "public")
	/* Endpoints */
	e.GET("/", bannerHandler)
	e.GET("/check", check)
	e.GET("/update", hit)
	e.GET("/status", status)
	e.GET("/monit", monit)
	// e.Static("/dashboard", "src/dashboard/")
	e.GET("/ws", func(c echo.Context) error {
		serveWs(hub, c.Response(), c.Request())
		return nil
	})

	e.Logger.Fatal(e.Start(*addr))
}

func bannerHandler(c echo.Context) error {
	return c.String(http.StatusOK, banner)
}

func serverHeaderMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {

		id := c.QueryParam("c")
		if id == "" {
			id = xid.New().String()
		}
		ru, _ := url.Parse(c.Request().Referer())
		g := Guest{
			Source: strings.Replace(ru.Host, ":", "_", 1),
			Host:   c.RealIP(),
			Agent:  c.Request().UserAgent(),
			Xid:    id,
			Xexist: c.QueryParam("c") != "",
		}
		if g.Source == "" {
			g.Source = "unknown"
		}
		if g.Agent == "" {
			g.Agent = "n/a"
		}
		c.Set("guest", g)

		c.Response().Header().Set(echo.HeaderServer, "GOSTATS/3.0")
		return next(c)
	}
}

func check(c echo.Context) error {
	g, _ := c.Get("guest").(Guest)
	fmt.Println(g)
	for _, e := range os.Environ() {
		pair := strings.SplitN(e, "=", 2)
		fmt.Println("ENV", pair[0], pair[1])
	}
	return c.JSON(http.StatusOK, g)
}

func hit(c echo.Context) error {
	g := c.Get("guest").(Guest)
	if countPreReq || g.Xexist {
		Persist(g)
	}
	if countPreReq || g.Source != "unknown" {
		c.Response().Header().Add("content-type", "text/javascript")
		s := strings.Replace(strings.Replace(filJS, "[XID]", g.Xid, 1), "[INIT]", strconv.FormatBool(!g.Xexist), 1)
		return c.String(http.StatusOK, s)
	}
	return c.String(200, "")
}

func monit(c echo.Context) error {
	c.Response().Header().Add("content-type", "text/html")
	return c.String(http.StatusOK, filHTML)
}

func status(c echo.Context) error {
	return c.JSON(http.StatusOK, Latest())
}
