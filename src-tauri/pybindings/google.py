

import requests

# Your OAuth 2.0 access token
ACCESS_TOKEN = 'your_token'
# Google Drive API endpoint to list files
url = "https://www.googleapis.com/drive/v3/files"

# Optional parameters to filter files, adjust 'q' to fit your search (e.g., search by name)
params = {
    "q": "name contains 'your_filename'",  # Replace 'your_filename' with the actual name
    "fields": "files(id, name, mimeType)"  # Adjust fields to fetch more metadata if needed
}

# Set up the authorization header
headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}"
}

# Make the request to list files
response = requests.get(url, headers=headers, params=params)

# Check if the request was successful
if response.status_code == 200:
    files = response.json().get('files', [])
    if not files:
        print("No files found.")
    else:
        for file in files:
            print(f"Found file: {file['name']} (ID: {file['id']})")
            file_id = file['id']
            # Optionally, download or read the file content
            download_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
            file_response = requests.get(download_url, headers=headers)

            if file_response.status_code == 200:
                # Save or process the file content
                file_content = file_response.content
                with open(file['name'], 'wb') as f:
                    f.write(file_content)
                print(f"Downloaded file: {file['name']}")
            else:
                print(f"Error downloading file: {file_response.status_code}, {file_response.text}")
else:
    print(f"Error: {response.status_code}, {response.text}")
