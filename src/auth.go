package main

import (
	"strings"

	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
)

var (
	usr          = "admin"
	pwd          = "secret"
	secret       string
	secureRoutes = []string{"/status", "/monit"}
)

// BasicAuthentication for dashboard
func BasicAuthentication() echo.MiddlewareFunc {
	return middleware.BasicAuthWithConfig(middleware.BasicAuthConfig{
		Realm: "",
		Skipper: func(c echo.Context) bool {
			if secret == c.Request().URL.Query().Get("auth") {
				return true
			}
			for _, v := range secureRoutes {
				if strings.Contains(c.Path(), v) {
					return false
				}
			}
			return true
		},
		Validator: func(username, password string, c echo.Context) (bool, error) {
			return username == usr && password == pwd, nil
		},
	})
}
