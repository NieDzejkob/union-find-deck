#include <iostream>
using namespace std;

const int MAX_N = 200000;
int N, M;
int size[MAX_N];
int parent[MAX_N];

int find(int a) {
    while (parent[a] != a) {
        a = parent[a];
    }

    return a;
}

void merge(int a, int b) {
    a = find(a); b = find(b);
    if (a == b) return;
    if (size[a] < size[b])
        swap(a, b);
    parent[b] = a;
    size[a] += size[b];
}

int main() {
    ios::sync_with_stdio(false); cin.tie();
    cin >> N >> M;

    for (int i = 0; i < N; i++) {
        parent[i] = i;
        size[i] = 1;
    }
}
