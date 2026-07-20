import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'choose-section',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/access-choice/access-choice.component').then(
        (m) => m.AccessChoiceComponent
      )
  },
  {
    path: 'orders-management',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/orders/orders.component').then((m) => m.OrdersComponent)
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./components/home/home.component').then((m) => m.HomeComponent)
      },
      {
        path: 'cat',
        loadComponent: () =>
          import('./components/categories/categories.component').then((m) => m.CategoriesComponent)
      },
      {
        path: 'tea-pro',
        loadComponent: () =>
          import('./components/tea-products/tea-products.component').then(
            (m) => m.TeaProductsComponent
          )
      },
      {
        path: 'teaw',
        loadComponent: () =>
          import('./components/teaware/teaware.component').then((m) => m.TeawareComponent)
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // يقلل شغل الـ scroll/restoration اللي بيحسّس الصفحة بالثقل
    scrollPositionRestoration: 'disabled',
    anchorScrolling: 'disabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
