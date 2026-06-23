import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import Layout from '../../components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input } from '@flux/ui';

type EventFormData = {
  title: string;
  description: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  location: string;
};

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>();

  const locationValue = watch('location');

  const onSubmit = async (data: EventFormData) => {
    setError('');
    setLoading(true);

    const { title, description, date, time, endDate, endTime, location } = data;

    const combinedDateTime = new Date(`${date}T${time}`).toISOString();
    let combinedEndDateTime: string | undefined = undefined;
    if (endDate && endTime) {
      combinedEndDateTime = new Date(`${endDate}T${endTime}`).toISOString();
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          date: combinedDateTime,
          endDate: combinedEndDateTime,
          location,
        }),
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.message || 'Falha ao cadastrar evento no servidor.');
      }

      router.push('/events');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 bg-[#FAFAFA]">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-normal">Novo Evento</h1>
          <p className="text-sm text-neutral-500 mt-2 leading-relaxed">Cadastre as informações básicas. Você poderá configurar ingressos, lotes e publicação na próxima etapa.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-500 text-sm p-4 rounded-lg">
            {error}
          </div>
        )}

        <Card className="border-[#EAEAEA] bg-white rounded-xl shadow-sm">
          <CardHeader className="border-b border-[#EAEAEA] pb-5 px-6 pt-6">
            <CardTitle className="text-neutral-900 font-bold text-xl tracking-normal mb-1">Informações Gerais</CardTitle>
            <CardDescription className="text-neutral-500 text-sm leading-relaxed">Estes dados serão exibidos no portal público do consumidor.</CardDescription>
            <p className="text-xs text-neutral-400 mt-2">* Campos obrigatórios</p>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-8 px-6 pt-6 pb-8">
              {/* Título */}
              <div className="space-y-1">
                <label htmlFor="title" className="text-xs font-bold tracking-normal text-neutral-500">Título do Evento *</label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Ex: Festival de Inverno 2027"
                  disabled={loading}
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'title-error' : undefined}
                  className={`w-full bg-[#FAFAFA] border rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:ring-2 ${
                    errors.title 
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' 
                      : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-[#FF3200]/10'
                  }`}
                  {...register('title', { required: 'Este campo é obrigatório.' })}
                />
                {errors.title && (
                  <span id="title-error" className="text-[10px] text-red-500 font-medium ml-2">{errors.title.message}</span>
                )}
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label htmlFor="description" className="text-xs font-bold tracking-normal text-neutral-500">Descrição</label>
                <textarea
                  id="description"
                  placeholder="Descreva o evento. Essas informações serão exibidas na página pública."
                  rows={4}
                  disabled={loading}
                  className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-2xl p-4 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10 transition-all duration-200"
                  {...register('description')}
                />
              </div>

              {/* Horário do Evento */}
              <div className="space-y-4 bg-neutral-50/50 p-5 rounded-2xl border border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-800 tracking-tight">Horário do Evento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <label htmlFor="date" className="text-xs font-bold tracking-normal text-neutral-500">Data de Início *</label>
                      <Input
                        id="date"
                        type="date"
                        disabled={loading}
                        aria-invalid={!!errors.date}
                        className={`w-full bg-[#FAFAFA] border rounded-full px-4 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:ring-2 ${
                          errors.date ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-[#FF3200]/10'
                        }`}
                        {...register('date', { required: 'Obrigatório.' })}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label htmlFor="time" className="text-xs font-bold tracking-normal text-neutral-500">Hora *</label>
                      <Input
                        id="time"
                        type="time"
                        disabled={loading}
                        aria-invalid={!!errors.time}
                        className={`w-full bg-[#FAFAFA] border rounded-full px-4 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:ring-2 ${
                          errors.time ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-[#FF3200]/10'
                        }`}
                        {...register('time', { required: 'Obrigatório.' })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <label htmlFor="endDate" className="text-xs font-bold tracking-normal text-neutral-500">Data de Término</label>
                      <Input
                        id="endDate"
                        type="date"
                        disabled={loading}
                        className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-full px-4 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10"
                        {...register('endDate')}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label htmlFor="endTime" className="text-xs font-bold tracking-normal text-neutral-500">Hora</label>
                      <Input
                        id="endTime"
                        type="time"
                        disabled={loading}
                        className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-full px-4 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10"
                        {...register('endTime')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Localização Autocomplete */}
              <div className="space-y-1 relative">
                <label htmlFor="location" className="text-xs font-bold tracking-normal text-neutral-500">Localização / Arena *</label>
                <Input
                  id="location"
                  type="text"
                  placeholder="Ex: Arena Digital, São Paulo - SP"
                  disabled={loading}
                  aria-invalid={!!errors.location}
                  aria-describedby={errors.location ? 'location-error' : undefined}
                  role="combobox"
                  aria-expanded={showLocationSuggestions}
                  aria-autocomplete="list"
                  className={`w-full bg-[#FAFAFA] border rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:ring-2 ${
                    errors.location ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-[#FF3200]/10'
                  }`}
                  {...register('location', { 
                    required: 'A localização é obrigatória.',
                    onChange: () => setShowLocationSuggestions(true),
                    onBlur: () => setTimeout(() => setShowLocationSuggestions(false), 200)
                  })}
                />
                {errors.location && (
                  <span id="location-error" className="text-[10px] text-red-500 font-medium ml-2">{errors.location.message}</span>
                )}
                
                {showLocationSuggestions && locationValue && locationValue.length > 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg p-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <button 
                      type="button" 
                      className="w-full text-left px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 rounded-lg flex items-center gap-2 transition-colors"
                      onClick={() => {
                        setValue('location', locationValue + ' - Encontrado pelo Google Maps');
                        setShowLocationSuggestions(false);
                      }}
                    >
                      <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      Buscar "{locationValue}" no Google Maps
                    </button>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex justify-between items-center px-6 py-5 border-t border-[#EAEAEA] bg-neutral-50/30">
              <button
                type="button"
                onClick={() => router.push('/events')}
                disabled={loading}
                aria-label="Cancelar criação do evento"
                className="text-sm font-semibold text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                aria-label="Salvar novo evento"
                className="bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold py-2.5 px-8 rounded-full border-none transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Salvar Evento'}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
