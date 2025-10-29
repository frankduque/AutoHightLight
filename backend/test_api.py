import requests
import time

BASE_URL = "http://localhost:8001/api"

def test_fetch_metadata():
    """Testa buscar metadados"""
    print("1️⃣ Testando fetch metadata...")
    
    response = requests.post(f"{BASE_URL}/videos/fetch-metadata", json={
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll pra testar
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Metadados recebidos: {data['title']}")
        return data
    else:
        print(f"❌ Erro: {response.status_code}")
        print(response.text)
        return None

def test_create_video(metadata):
    """Testa criar vídeo"""
    print("\n2️⃣ Testando criar vídeo...")
    
    response = requests.post(f"{BASE_URL}/videos", json=metadata)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Vídeo criado: ID {data['id']}")
        return data
    else:
        print(f"❌ Erro: {response.status_code}")
        print(response.text)
        return None

def test_list_videos():
    """Testa listar vídeos"""
    print("\n3️⃣ Testando listar vídeos...")
    
    response = requests.get(f"{BASE_URL}/videos")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Vídeos listados: {data['total']} total")
        return data
    else:
        print(f"❌ Erro: {response.status_code}")
        return None

def test_start_download(video_id):
    """Testa iniciar download"""
    print("\n4️⃣ Testando iniciar download...")
    
    response = requests.post(f"{BASE_URL}/videos/{video_id}/download")
    
    if response.status_code == 200:
        print(f"✅ Download iniciado para vídeo {video_id}")
        return True
    else:
        print(f"❌ Erro: {response.status_code}")
        print(response.text)
        return False

def test_download_progress(video_id):
    """Testa buscar progresso"""
    print("\n5️⃣ Testando progresso do download...")
    
    for i in range(5):
        response = requests.get(f"{BASE_URL}/videos/{video_id}/download-progress")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Progresso: {data['progress']}% - Status: {data['status']}")
            
            if data['status'] == 'downloaded':
                print("✅ Download completo!")
                return True
            elif data['status'] == 'failed':
                print(f"❌ Download falhou: {data['error']}")
                return False
        
        time.sleep(2)
    
    print("⏳ Download ainda em andamento...")
    return None

if __name__ == "__main__":
    print("🚀 Testando Backend - Fase 1\n")
    print("="*50)
    
    # Teste 1: Buscar metadados
    metadata = test_fetch_metadata()
    if not metadata:
        exit(1)
    
    # Teste 2: Criar vídeo
    video = test_create_video(metadata)
    if not video:
        exit(1)
    
    # Teste 3: Listar vídeos
    test_list_videos()
    
    # Teste 4: Iniciar download
    if test_start_download(video['id']):
        # Teste 5: Acompanhar progresso
        test_download_progress(video['id'])
    
    print("\n" + "="*50)
    print("🎉 Testes da Fase 1 concluídos!")
    print("\nAcesse http://localhost:8001/docs para ver a documentação completa")
