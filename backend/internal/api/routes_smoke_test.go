package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRouteRegistration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	s := &Server{router: gin.New(), connMgr: NewConnectionManager()}
	s.setupRoutes()

	cases := []struct {
		method, path string
		want         int
	}{
		{"GET", "/api/v1/projects/11111111-2222-3333-4444-555555555555/content", http.StatusUnauthorized},
		{"POST", "/api/v1/projects/save", http.StatusUnauthorized},
		{"GET", "/api/v1/projects", http.StatusUnauthorized},
	}
	for _, tc := range cases {
		w := httptest.NewRecorder()
		s.router.ServeHTTP(w, httptest.NewRequest(tc.method, tc.path, nil))
		if w.Code != tc.want {
			t.Errorf("%s %s = %d, want %d (body: %s)", tc.method, tc.path, w.Code, tc.want, w.Body.String())
		}
	}
}
