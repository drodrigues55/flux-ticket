import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@flux/ui';
import Link from 'next/link';

export default function OverviewPage() {
  // Dados simulados para o painel de visão geral
  const stats = [
    { name: 'Receita Bruta', value: 'R$ 15.420,00', change: '+12.5%', isPositive: true },
    { name: 'Ingressos Vendidos', value: '154 / 500', change: 'Lote 1 ativo', isPositive: true },
    { name: 'Sessões Ativas no Checkout', value: '12', change: 'Sem abandono', isPositive: true },
    { name: 'Taxa de Conversão', value: '30.8%', change: '+2.1%', isPositive: true },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-white">Visão Geral</h1>
          <p className="text-sm text-neutral-400 mt-1">Acompanhe as métricas de vendas e engajamento em tempo real.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.name} className="border-neutral-850 bg-[#1A1A1A]">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
                  {stat.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono font-black text-white">{stat.value}</div>
                <div className="mt-1 flex items-center space-x-1 text-xs">
                  <span className={stat.isPositive ? 'text-cosmic-neon font-semibold' : 'text-red-400 font-semibold'}>
                    {stat.change}
                  </span>
                  <span className="text-neutral-500">desde o último lote</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Seção de Ações Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-neutral-850">
            <CardHeader>
              <CardTitle>Painel do Organizador</CardTitle>
              <CardDescription>
                Você está conectado com privilégios de Administrador. Aqui você pode cadastrar shows, gerenciar lotes de ingressos e consultar relatórios.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex space-x-4">
              <Link href="/events" legacyBehavior>
                <Button variant="primary">Gerenciar Meus Eventos</Button>
              </Link>
              <Link href="/events/new" legacyBehavior>
                <Button variant="outline">Cadastrar Novo Evento</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-neutral-850 bg-gradient-to-br from-cosmic-slate to-[#1a2327]">
            <CardHeader>
              <CardTitle>Alertas de Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-neutral-400">
              <div className="flex items-start space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-cosmic-neon shrink-0 mt-1" />
                <p>O Redis Cluster está operando e roteando chaves stock e lock com sucesso.</p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1" />
                <p>Controles de acesso baseados em roles (RBAC) estão ativos em todos os endpoints.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
