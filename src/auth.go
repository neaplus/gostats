package main

import (
	"strings"

	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
)

var (
	usr       = "admin"
	pwd       = "secret"
	secret    string
	pubRoutes = []string{"/check", "/update"}
)

// BasicAuthentication for dashboard
func BasicAuthentication() echo.MiddlewareFunc {
	return middleware.BasicAuthWithConfig(middleware.BasicAuthConfig{
		Realm: "",
		Skipper: func(c echo.Context) bool {
			if secret == c.Request().URL.Query().Get("auth") {
				return true
			}
			for _, v := range pubRoutes {
				if c.Path() == "/" || strings.Contains(c.Path(), v) {
					return true
				}
			}
			return false
		},
		Validator: func(username, password string, c echo.Context) (bool, error) {
			return username == usr && password == pwd, nil
		},
	})
}
