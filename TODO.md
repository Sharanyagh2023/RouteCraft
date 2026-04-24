# RouteCraft Auth + Routing Integration TODO

## Approved Corrections
- [x] /track route is PUBLIC (directly renders Dashboard for shared links)
- [x] Login is simplified: no password validation, just store user in localStorage
- [x] ProtectedRoute safely checks for null/invalid user
- [x] BrowserRouter wraps Router in main.tsx

## Implementation Steps

- [ ] 1. Install react-router-dom dependency
- [ ] 2. Create `src/components/ProtectedRoute.tsx`
- [ ] 3. Create `src/pages/LandingPage.tsx`
- [ ] 4. Create `src/pages/LoginPage.tsx`
- [ ] 5. Create `src/pages/SignupPage.tsx`
- [ ] 6. Create `src/Router.tsx`
- [ ] 7. Update `src/main.tsx`
- [ ] 8. Test the flow: Landing → Login → Dashboard

